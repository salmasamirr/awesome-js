import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { SchemaManagerService } from './schema-manager.service';
import { ValidationService } from './validation.service';

@Injectable({ providedIn: 'root' })
export class LLMService {
  private readonly apiUrl = 'http://127.0.0.1:1234/v1/chat/completions';
  private messageHistory: string[] = [];

  constructor(
    private http: HttpClient,
    private schemaManager: SchemaManagerService,
    private validationService: ValidationService
  ) { }

  generateChartOptions(query: string, chartType: string = 'bar', variation?: string): Observable<any> {
    return from(
      Promise.all([
        this.schemaManager.loadCombinedSchema(chartType, variation),
        this.schemaManager.loadExample(chartType, variation)
      ])
    ).pipe(
      switchMap(([schema, example]) => {
        const messages = this.generatePrompt(query, chartType, variation, schema, example);

        const body = {
          model: "meta-llama-3.1-8b-instruct",
          messages: [
            { role: "system", content: "You are an ECharts expert. Return only valid JSON, no explanations." },
            { role: "user", content: this.formatMessageForBackend(messages) }
          ],
          temperature: 0.7
        };

        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        return this.http.post<any>(this.apiUrl, body, { headers }).pipe(
          map(response => {

            let rawContent = response?.choices?.[0]?.message?.content || response;

            rawContent = rawContent.replace(/```json|```/g, '').trim();

            let data;
            try {
              data = JSON.parse(rawContent);
            } catch (err) {
              console.error('Invalid JSON returned by LLM:', rawContent);
              throw new Error('Invalid JSON returned by LLM.');
            }

            if (Array.isArray(data.xAxis)) data.xAxis = { data: data.xAxis };
            if (Array.isArray(data.yAxis)) data.yAxis = { data: data.yAxis };

            return data;
          }),
          switchMap((parsedData: any) =>
            from(this.validationService.validateResponse(parsedData, schema)).pipe(
              switchMap((result) => {
                if (!result.valid) {
                  console.error('LLM returned invalid chart:', result.error);
                  return throwError(() => new Error(`LLM returned invalid chart: ${result.error}`));
                }
                return [result.data];
              })
            )
          ),
          catchError((error) => throwError(() => new Error(`Failed to generate chart: ${error.message || error}`)))
        );
      }),
      catchError(err => throwError(() => new Error(`Chart generation error: ${err.message || err}`)))
    );
  }

  private formatMessageForBackend(messages: any[]): string {
    return messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');
  }

  private generatePrompt(query: string, chartType: string, variation?: string, schema?: any, example?: any): any[] {
    const actualSeriesType = chartType === 'area' ? 'line' : chartType;
    const areaNote = chartType === 'area' ? '\nInclude areaStyle: {} in series for area chart.' : '';

    const messages: any[] = [
      {
        role: 'system',
        content: `You are an ECharts expert. Generate a full chart configuration as valid JSON only. Chart type must be "${chartType}" and series.type "${actualSeriesType}".${areaNote}`
      },
      {
        role: 'user',
        content: `Create a ${chartType} chart for: "${query}". Include realistic data, title, xAxis, yAxis, series. Follow schema strictly. Use example reference but generate different data.`
      }
    ];

    if (schema && Object.keys(schema).length > 0) {
      messages.push({ role: 'system', content: `Schema reference: ${JSON.stringify(schema, null, 2)}` });
    }

    if (example && Object.keys(example).length > 0) {
      messages.push({ role: 'system', content: `Example reference: ${JSON.stringify(example, null, 2)}` });
    }

    return messages;
  }
}
