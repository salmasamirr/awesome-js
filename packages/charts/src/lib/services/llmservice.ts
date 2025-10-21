import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SchemaManagerService } from './schema-manager.service';

@Injectable({ providedIn: 'root' })
export class LLMService {
  private readonly apiUrl = 'http://localhost:8000/chat-raw';
  private messageHistory: string[] = [];

  constructor(private http: HttpClient, private schemaManager: SchemaManagerService) {}

  generateChartOptions(query: string, chartType: string = 'bar', variation?: string): Observable<any> {
    return new Observable(observer => {
      // Load schema and example asynchronously
      Promise.all([
        this.schemaManager.loadCombinedSchema(chartType, variation),
        this.schemaManager.loadExample(chartType, variation)
      ]).then(([schema, example]) => {
        const prompt = this.generatePrompt(query, chartType, variation, schema, example);
        
        this.messageHistory.push(`User: ${query}`);

        const body = {
          message: prompt,
          session_id: `chart-session-${Date.now()}` // Add timestamp to make each request unique
        };

        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        });

        console.log('Sending request to LLM:', body);
        this.http.post<any>(this.apiUrl, body, { headers }).pipe(
          map((response) => {
            console.log('LLM Response:', response);
            const raw = response?.response || response;
            
            if (!raw) {
              throw new Error('Empty response from backend');
            }

            let parsed;
            
            if (typeof raw === 'object' && raw !== null) {
              parsed = raw;
            } else if (typeof raw === 'string') {
              try {
                const jsonMatch = raw.match(/\{[\s\S]*\}/);
                const jsonString = jsonMatch ? jsonMatch[0] : raw;
                parsed = JSON.parse(jsonString);
              } catch (err) {
                throw new Error('Invalid JSON returned from server');
              }
            } else {
              throw new Error('Unexpected response format');
            }

            // Ensure chart type
            if (parsed.series && Array.isArray(parsed.series)) {
              parsed.series.forEach((series: any) => {
                if (!series.type) {
                  series.type = chartType;
                }
              });
            }

            this.messageHistory.push(`Assistant: Generated ${chartType} chart`);
            return parsed;
          }),
          catchError((err) => {
            console.error('Chart generation error:', err);
            return throwError(() => err);
          })
        ).subscribe({
          next: res => observer.next(res),
          error: err => observer.error(err),
          complete: () => observer.complete()
        });
      }).catch(error => {
        console.error('Error loading schema/example:', error);
        observer.error(error);
      });
    });
  }

  private generatePrompt(query: string, chartType: string, variation?: string, schema?: any, example?: any): string {
    let prompt = `You are an ECharts expert. Create a unique "${chartType}" chart based on the user's request: "${query}"\n\n`;
    
    // Add message history context
    if (this.messageHistory.length > 0) {
      prompt += `Previous conversation:\n${this.messageHistory.join('\n')}\n\n`;
    }

    // Add schema information if available
    if (schema && Object.keys(schema).length > 0) {
      prompt += `Required schema structure (MUST follow this format):\n${JSON.stringify(schema, null, 2)}\n\n`;
    }

    // Add example if available
    if (example && Object.keys(example).length > 0) {
      prompt += `Reference example (use as inspiration but create different data):\n${JSON.stringify(example, null, 2)}\n\n`;
    }

    // Add specific instructions based on chart type
    const chartInstructions: { [key: string]: string } = {
      bar: "Create a bar chart with different categories and values. Use meaningful category names and realistic data.",
      line: "Create a line chart showing trends over time. Use time-based categories and realistic trend data.",
      pie: "Create a pie chart with different segments. Use meaningful labels and varied percentages.",
      scatter: "Create a scatter plot with x,y coordinates. Use realistic coordinate data.",
      radar: "Create a radar chart with multiple indicators. Use meaningful indicator names and values.",
      gauge: "Create a gauge chart showing a single metric. Use realistic gauge values.",
      area: "Create an area chart with filled areas. Use time-based data with realistic values.",
      treemap: "Create a treemap with hierarchical data. Use meaningful node names and values.",
      sunburst: "Create a sunburst chart with nested data. Use hierarchical structure with meaningful names.",
      sankey: "Create a sankey diagram showing flow between nodes. Use meaningful source and target names.",
      heatmap: "Create a heatmap with matrix data. Use meaningful row and column labels.",
      funnel: "Create a funnel chart showing conversion stages. Use meaningful stage names and decreasing values.",
      candlestick: "Create a candlestick chart with OHLC data. Use realistic financial data.",
      boxplot: "Create a boxplot showing statistical distributions. Use meaningful category names.",
      graph: "Create a network graph with nodes and links. Use meaningful node names and connections.",
      map: "Create a map chart with geographic data. Use realistic geographic locations.",
      parallel: "Create a parallel coordinates chart. Use multiple dimensions with realistic data."
    };

    const instruction = chartInstructions[chartType] || "Create a meaningful chart with realistic data.";
    prompt += `Instructions: ${instruction}\n\n`;

    prompt += `IMPORTANT: 
- Generate UNIQUE data based on the user's request: "${query}"
- Use DIFFERENT values, categories, and labels each time
- Make the chart relevant to the user's specific request
- Ensure all data is realistic and meaningful
- Respond ONLY with valid JSON
- Use type: "${chartType}" in series
- Include proper title, axes, and series configuration
- Current timestamp: ${new Date().toISOString()}
- Request ID: ${Math.random().toString(36).substr(2, 9)}`;

    return prompt;
  }

}