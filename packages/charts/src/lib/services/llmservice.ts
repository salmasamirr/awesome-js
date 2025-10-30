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

        return this.http.post<any>(this.apiUrl, body, { headers });
      }),
      map((response) => {
        // Use validation service to extract and validate response
        const validation = this.validationService.validateResponse(response);
        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.error}`);
        }

        let parsed = validation.data;

        // Ensure series type is set correctly and fix data structure
        if (parsed.series && Array.isArray(parsed.series)) {
          parsed.series.forEach((series: any) => {
            // Handle area charts specially - they use "line" type with areaStyle
            if (chartType === 'area') {
              if (!series.type || series.type !== 'line') {
                ;
                series.type = 'line';
              }
              // Ensure areaStyle is present for area charts
              if (!series.areaStyle) {
                series.areaStyle = {};
              }
            } else if (!series.type || series.type !== chartType) {
              series.type = chartType;
            }

            // Fix data structure for specific chart types
            if (chartType === 'treemap' && series.data && Array.isArray(series.data)) {
              // Convert simple numbers to treemap data structure
              series.data = series.data.map((value: any, index: number) => {
                if (typeof value === 'number') {
                  return {
                    name: `Item ${index + 1}`,
                    value: value
                  };
                }
                return value;
              });
            }

            // Ensure visualMap is present for heatmap charts
            if (chartType === 'heatmap' && !parsed.visualMap) {
              let min = 0;
              let max = 10;
              if (series.data && Array.isArray(series.data) && series.data.length > 0) {
                const values = series.data.map((item: any) => Array.isArray(item) ? item[2] : item.value).filter((v: any) => typeof v === 'number');
                if (values.length > 0) {
                  min = Math.min(...values);
                  max = Math.max(...values);
                }
              }
              parsed.visualMap = {
                min: min,
                max: max,
                calculable: true,
                orient: 'horizontal',
                left: 'center'
              };
            }
          });
        }

        // Validate that the chart type matches
        if (parsed.series && Array.isArray(parsed.series)) {
          let hasCorrectType = false;

          if (chartType === 'area') {
            // For area charts, check for "line" type with areaStyle
            hasCorrectType = parsed.series.some((series: any) =>
              series.type === 'line' && series.areaStyle
            );
          } else {
            hasCorrectType = parsed.series.some((series: any) => series.type === chartType);
          }

          if (!hasCorrectType) {
            parsed.series.forEach((series: any) => {
              if (chartType === 'area') {
                series.type = 'line';
                if (!series.areaStyle) {
                  series.areaStyle = {};
                }
              } else {
                series.type = chartType;
              }
            });
          }
        }

        const finalChartType = parsed.series?.[0]?.type || 'unknown';

        // Check if the LLM returned the wrong chart type
        if (chartType !== 'area' && finalChartType !== chartType) {
          // For non-area charts, we should have the correct type
          if (parsed.series && Array.isArray(parsed.series)) {
            parsed.series.forEach((series: any) => {
              if (series.type !== chartType) {
                series.type = chartType;
              }
            });
          }
        }
        this.messageHistory.push(`Assistant: Generated ${chartType} chart`);
        return parsed;
      }),
      catchError((err) => {
        return throwError(() => err);
      })
    );
  }

  private formatMessageForBackend(messages: any[]): string {
    // Send all messages to maintain context
    const allMessages = [
      ...this.messageHistory,
      ...messages.map(msg => `${msg.role}: ${msg.content}`)
    ];

    return allMessages.join('\n\n');
  }

  private generatePrompt(query: string, chartType: string, variation?: string, schema?: any, example?: any): any[] {
    const messages: any[] = [];

    // Handle area charts specially in the prompt
    const actualSeriesType = chartType === 'area' ? 'line' : chartType;
    const areaChartNote = chartType === 'area' ? '\nIMPORTANT: For area charts, use series type "line" with areaStyle property.' : '';

    messages.push({
      role: "system",
      content: `You are an ECharts expert. Generate a complete ECharts configuration in JSON format for a "${chartType}" chart.

🚨 CRITICAL REQUIREMENTS - READ CAREFULLY:
1. You MUST return ONLY valid JSON, no other text or explanations
2. The chart type MUST be exactly "${chartType}" - NOT bar, NOT line, but "${chartType}"
3. The series type MUST be "${actualSeriesType}"${areaChartNote}
4. Follow the provided schema structure exactly
5. Use the provided example as a reference but create different data
6. The JSON must be a complete ECharts option object that can be used directly with echarts.setOption()

⚠️ WARNING: If you return a bar chart when asked for a ${chartType} chart, your response will be rejected!`
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

🚨 MANDATORY REQUIREMENTS - FOLLOW EXACTLY:
- Return ONLY valid JSON, no other text or explanations
- Chart type MUST be exactly: ${chartType} (NOT bar, NOT line)
- Series type MUST be exactly: ${actualSeriesType}${areaChartNote}
- Title should reflect the ${chartType} chart type
- Include realistic data for: ${query}
- Must have: title, xAxis, yAxis, series with data
- Generate meaningful categories and values
- Make it visually appealing
- Follow the provided schema structure exactly
- Use the provided example as reference but create different data

⚠️ CRITICAL: The series.type field MUST be "${actualSeriesType}", not "bar" or "line" or any other type!${chartType === 'area' ? ' For area charts, also include areaStyle: {} in the series.' : ''}

🔥 REMEMBER: You are creating a ${chartType} chart, NOT a bar chart!`
    });

    return messages;
  }
}