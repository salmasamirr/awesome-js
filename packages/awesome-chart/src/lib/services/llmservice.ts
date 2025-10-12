import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { echartsOptionsSchema } from '../schemas/echarts-options.schema';
import { echartsBaseModel } from '../schemas/echarts_base_model';
import { echartsDerivativeModel } from '../schemas/echarts_derivative_model';
import { SchemaManagerService } from './schema-manager.service';

@Injectable({ providedIn: 'root' })
export class LLMService {
  private ajv;
  private validate;
  private readonly apiUrl = 'http://localhost:8000/chat-raw';
  private readonly model = 'llama3';

  constructor(
    private http: HttpClient,
    private schemaManager: SchemaManagerService
  ) {
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
      allowUnionTypes: true,
      verbose: true
    });

    addFormats(this.ajv);
    this.ajv.addSchema(echartsBaseModel, 'EChartsBaseOptions');
    this.ajv.addSchema(echartsDerivativeModel, 'EChartsDerivativeOptions');
    this.validate = this.ajv.compile(echartsOptionsSchema);
  }

generateChartOptions(query: string, chartType: string = 'bar'): Observable<any> {
  // Generate enhanced prompt with schema and example
  const enhancedPrompt = this.schemaManager.generatePromptWithSchema(query, chartType);
  
  
  const body = {
    message: enhancedPrompt,
    session_id: 'chart-session'
  };

  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  });

  return this.http.post<any>(this.apiUrl, body, { headers }).pipe(
    map((response) => {
      const raw = response?.response || response;
      if (!raw) {
        throw new Error('Empty response from backend');
      }

      let parsed;
      try {
        parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (err) {
        throw new Error('Invalid JSON returned from server');
      }

      // Fix chart type if it doesn't match
      if (parsed.series && parsed.series.length > 0) {
        const actualChartType = parsed.series[0].type;
        if (actualChartType !== chartType) {
          parsed.series[0].type = chartType;
        }
      }

      return parsed;
    }),
    catchError((err) => {
      console.error('Chart generation error:', err);
      return throwError(() => err);
    })
  );
}

  sendChatMessage(message: string, sessionId: string = 'chart-session'): Observable<{ response: string, session_id: string, timestamp: string }> {
    const body = { message, session_id: sessionId };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<any>(this.apiUrl, body, { headers }).pipe(
      map((response) => {
        console.log('Chat-raw response:', response);
        return response;
      }),
      catchError((err) => {
        console.error('Chat-raw error:', err);
        return throwError(() => err);
      })
    );
  }

  private validateOptions(json: any): boolean {
    return this.validate(json) as boolean;
  }
}
