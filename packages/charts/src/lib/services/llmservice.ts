import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { SchemaManagerService } from './schema-manager.service';
import { ValidationService } from './validation.service';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

@Injectable({ providedIn: 'root' })
export class LLMService {
  private readonly apiUrl = 'http://localhost:5000/chat';
  private messageHistory: ChatMessage[] = [];

  constructor(
    private http: HttpClient,
    private schemaManager: SchemaManagerService,
    private validationService: ValidationService
  ) { }

  generateChartOptions(query: string, chartType: string = 'bar', variation?: string, chatHistory?: ChatMessage[]): Observable<any> {
    const schemaPromise = Promise.all([
      this.schemaManager.loadCombinedSchema(chartType, variation),
      this.schemaManager.loadExample(chartType, variation)
    ]);

    return from(schemaPromise).pipe(
      switchMap(([schema, example]) => {
        const messages = this.generatePrompt(query, chartType, variation, schema, example, chatHistory);
        const body = {
          messages: messages,
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

  private generatePrompt(query: string, chartType: string, variation?: string, schema?: any, example?: any, chatHistory?: ChatMessage[]): any[] {
    const messages: any[] = [];

    const actualSeriesType = chartType === 'area' ? 'line' : chartType;
    const areaChartNote = chartType === 'area' ? '\nIMPORTANT: For area charts, use series type "line" with areaStyle property.' : '';

    let systemPrompt = `You are an ECharts expert. Generate a complete ECharts configuration in JSON format for a "${chartType}" chart.

🚨 CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON, no other text
2. Chart type MUST be "${chartType}"
3. Series type MUST be "${actualSeriesType}"${areaChartNote}
4. Create realistic data based on the user's detailed requirements
5. Include title, xAxis, yAxis, series with data
6. Make it visually appealing and match user specifications`;

    if (schema && Object.keys(schema).length > 0) {
      systemPrompt += `\n\nFollow this schema structure:
${JSON.stringify(schema, null, 2)}`;
    }

    if (example && Object.keys(example).length > 0) {
      systemPrompt += `\n\nExample reference (create different data):
${JSON.stringify(example, null, 2)}`;
    }

    messages.push({
      role: "system",
      content: systemPrompt
    });

    if (chatHistory && chatHistory.length > 0) {
      for (const msg of chatHistory) {
        if (!(msg.sender === 'user' && msg.text.trim() === query.trim())) {
          messages.push({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          });
        }
      }
    }

    const descriptiveUserMessage = this.createEnhancedDescriptiveUserMessage(query, chartType, variation);

    messages.push({
      role: "user",
      content: descriptiveUserMessage
    });

    return messages;
  }

  private createEnhancedDescriptiveUserMessage(query: string, chartType: string, variation?: string): string {
    let descriptiveMessage = `CREATE CHART REQUEST - ${chartType.toUpperCase()}\n\n`;

    descriptiveMessage += `📊 CHART SPECIFICATIONS:\n`;
    descriptiveMessage += `• Chart Type: ${chartType}\n`;
    if (variation) {
      descriptiveMessage += `• Variation: ${variation}\n`;
    }
    descriptiveMessage += `• User Requirements: "${query}"\n\n`;

    descriptiveMessage += `🎯 IMPLEMENTATION REQUIREMENTS:\n`;
    descriptiveMessage += `• Generate realistic sample data that matches the context\n`;
    descriptiveMessage += `• Include meaningful titles and axis labels\n`;
    descriptiveMessage += `• Ensure proper data visualization best practices\n`;
    descriptiveMessage += `• Create professional and visually appealing design\n`;

    if (chartType === 'area') {
      descriptiveMessage += `• Use line series with areaStyle for area chart visualization\n`;
    }

    descriptiveMessage += `\n📈 EXPECTED OUTPUT:\n`;
    descriptiveMessage += `A complete ECharts configuration in valid JSON format that accurately represents the described data scenario and follows all chart type specifications.`;

    return descriptiveMessage;
  }

  clearMessageHistory(): void {
    this.messageHistory = [];    
  }
}