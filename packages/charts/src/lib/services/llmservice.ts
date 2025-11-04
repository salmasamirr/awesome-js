import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { SchemaManagerService } from './schema-manager.service';
import { ValidationService } from './validation.service';

@Injectable({ providedIn: 'root' })
export class LLMService {
  private readonly apiUrl = 'http://localhost:5000/chat';
  private messageHistory: string[] = [];

  constructor(
    private http: HttpClient,
    private schemaManager: SchemaManagerService,
    private validationService: ValidationService
  ) { }

  generateChartOptions(query: string, chartType: string = 'bar', variation?: string): Observable<any> {
    const schemaPromise = Promise.all([
      this.schemaManager.loadCombinedSchema(chartType, variation),
      this.schemaManager.loadExample(chartType, variation)
    ]);

    return from(schemaPromise).pipe(
      switchMap(([schema, example]) => {
        const messages = this.generatePrompt(query, chartType, variation, schema, example);
        const body = {
          message: this.formatMessageForBackend(messages),
          chartType: chartType,
          variation: variation || '',
          session_id: `chart-session-${Date.now()}`
        };

        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        });

        return this.http.post<any>(this.apiUrl, body, { headers }).pipe(
          switchMap((response) => {
            let data = response;
            if (typeof response === 'string') {
              try {
                data = JSON.parse(response);
              } catch (e) {
                console.error('Failed to parse JSON response:', e);
                console.error('Raw response:', response);
                const errorMessage = e instanceof Error ? e.message : 'Unknown parsing error';
                throw new Error(`Invalid JSON response from LLM service: ${errorMessage}. Raw response: ${response.substring(0, 200)}...`);
              }
            }
            
            return from(this.validationService.validateResponse(data, schema)).pipe(
              map((validation) => {
                if (!validation.valid) {
                  throw new Error(`LLM returned invalid chart: ${validation.error}`);
                }
                return validation.data;
              })
            );
      }),
          catchError((error) => {
            console.error('HTTP error during chart generation:', error);
            return throwError(() => new Error(`Failed to connect to backend: ${error.message || error}`));
          })
        );
      }),
      catchError((err) => {
        return throwError(() => err);
      })
    );
  }

  private formatMessageForBackend(messages: any[]): string {
    const allMessages = [
      ...this.messageHistory,
      ...messages.map(msg => `${msg.role}: ${msg.content}`)
    ];

    return allMessages.join('\n\n');
  }

  private generatePrompt(query: string, chartType: string, variation?: string, schema?: any, example?: any): any[] {
    const messages: any[] = [];

    const actualSeriesType = chartType === 'area' ? 'line' : chartType;
    const areaChartNote = chartType === 'area' ? '\nIMPORTANT: For area charts, use series type "line" with areaStyle property.' : '';

    messages.push({
      role: "system",
      content: `You are an ECharts expert. Generate a complete ECharts configuration in JSON format for a "${chartType}" chart.

🚨 CRITICAL REQUIREMENTS - READ CAREFULLY:
1. You MUST return ONLY valid JSON, no other text or explanations
2. The chart type MUST be strictly "${chartType}" - NOT any type, but this type "${chartType}"
3. The series type MUST be "${actualSeriesType}"${areaChartNote}
4. Follow the provided schema structure strictly
5. Use the provided example as a reference but create different data
6. The JSON must be a complete ECharts option object that can be used directly with echarts.setOption()

⚠️ WARNING: If you return a wrong chart type, your response will be rejected!`
    });

    if (schema && Object.keys(schema).length > 0) {
      const schemaContent = `Follow this ECharts schema structure:
${JSON.stringify(schema, null, 2)}`;

      messages.push({
        role: "system",
        content: schemaContent
      });
    }

    if (example && Object.keys(example).length > 0) {
      const exampleContent = `Here is an example chart configuration for reference (create different data):
${JSON.stringify(example, null, 2)}`;

      messages.push({
        role: "system",
        content: exampleContent
      });
    }

    messages.push({
      role: "user",
      content: `Create a ${chartType} chart for: "${query}"

🚨 MANDATORY REQUIREMENTS - FOLLOW STRICTLY:
- Return ONLY valid JSON, no other text or explanations
- Chart type MUST be strictly: ${chartType} - NOT any type, but this type "${chartType}"
- Series type MUST be strictly: ${actualSeriesType}${areaChartNote}
- Title should reflect the ${chartType} chart type
- Include realistic data for: ${query}
- Must have: title, xAxis, yAxis, series with data
- Generate meaningful categories and values
- Make it visually appealing
- Follow the provided schema structure strictly
- Use the provided example as reference but create different data

⚠️ CRITICAL: The series.type field MUST be "${actualSeriesType}", not "line" or any other type!${chartType === 'area' ? ' For area charts, also include areaStyle: {} in the series.' : ''}

🔥 REMEMBER: You are creating a ${chartType} chart, NOT any other chart type!`
    });

    return messages;
  }
}