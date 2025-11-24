import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { SchemaManagerService } from './schema-manager.service';
import { ValidationService } from './validation.service';

interface LMStudioConfig {
  apiUrl: string;
  model: string;
  temperature: number;
  maxTokens?: number;
  topP?: number;
}
interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

@Injectable({ providedIn: 'root' })
export class LLMService {
  private config: LMStudioConfig = {
    apiUrl: '/v1/chat/completions',
    model: 'meta-llama-3.1-8b-instruct',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.9
  };
  private availableModels: string[] = [];

  constructor(
    private http: HttpClient,
    private schemaManager: SchemaManagerService,
    private validationService: ValidationService
  ) {
    this.detectAvailableModels();
  }

  private async detectAvailableModels(): Promise<void> {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const modelsUrl = this.config.apiUrl.replace('/chat/completions', '/models');
      const response = await this.http.get<any>(modelsUrl, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        })
      }).toPromise();

      if (response?.data && Array.isArray(response.data)) {
        this.availableModels = response.data.map((model: any) => model.id);

        const chatModels = this.availableModels.filter(model => !model.includes('embedding'));
        if (chatModels.length > 0) {
          this.config.model = chatModels[0];
        } else if (this.availableModels.length > 0) {
          this.config.model = this.availableModels[0];
        }

      }
    } catch (error) {
      console.warn('Could not detect LM Studio models, using default configuration:', error);
      this.config.model = 'meta-llama-3.1-8b-instruct';
    }
  }



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
          model: this.config.model,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          top_p: this.config.topP,
          stream: false,
          stop: null,
          presence_penalty: 0,
          frequency_penalty: 0
        };

        console.log('Final message sent to LM Studio:', JSON.stringify(body, null, 2));

        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        });

        return this.http.post<any>(this.config.apiUrl, body, { headers }).pipe(
          switchMap((response) => {
            const content = response?.choices?.[0]?.message?.content;
            if (!content) {
              throw new Error('Invalid response from LM Studio: No content found in response.');
            }

            let jsonString = this.extractJsonFromContent(content);

            let data;
            try {
              data = JSON.parse(jsonString);
              console.log('Successfully parsed JSON from LM Studio:', data);
            } catch (e) {
              console.error('Failed to parse JSON response from LM Studio:', e);
              console.error('Raw content:', content);
              console.error('Extracted JSON string:', jsonString);

              const alternativeJson = this.tryAlternativeJsonExtraction(content);
              if (alternativeJson) {
                try {
                  data = JSON.parse(alternativeJson);
                  console.log('Successfully parsed with alternative method:', data);
                } catch (altError) {
                  const errorMessage = e instanceof Error ? e.message : 'Unknown parsing error';
                  throw new Error(`Invalid JSON response from LM Studio: ${errorMessage}. Raw response: ${content.substring(0, 300)}...`);
                }
              } else {
                const errorMessage = e instanceof Error ? e.message : 'Unknown parsing error';
                throw new Error(`Invalid JSON response from LM Studio: ${errorMessage}. Raw response: ${content.substring(0, 300)}...`);
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
            console.error('HTTP error during chart generation with LM Studio:', error);

            if (error.status === 0) {
              return throwError(() => new Error('Cannot connect to LM Studio. Please ensure LM Studio is running on http://localhost:1234 and a model is loaded.'));
            } else if (error.status === 404) {
              return throwError(() => new Error('LM Studio endpoint not found. Please check if LM Studio is running with the correct API endpoint.'));
            } else if (error.status === 500) {
              return throwError(() => new Error('LM Studio internal error. Please check if a model is properly loaded.'));
            }

            return throwError(() => new Error(`Failed to connect to LM Studio: ${error.message || error}`));
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

    let systemPrompt = `You are an ECharts expert. Generate ONLY valid JSON configuration for "${chartType}" chart.

STRICT JSON FORMAT RULES:
- Return ONLY JSON object starting with { and ending with }
- NO explanations, comments, or text outside JSON
- NO schema properties like $schema, $id, properties, required
- NO markdown code blocks or backticks

MANDATORY STRUCTURE:
{
  "title": {"text": "Chart Title"},
  "series": [{"type": "${actualSeriesType}", "data": [...]}]
}

CRITICAL PROPERTY FORMATS:
- title: OBJECT {"text": "..."} NEVER array
- xAxis: OBJECT (not array) like {"type": "category", "data": [...]}
- yAxis: OBJECT (not array) like {"type": "value"}
- legend: OBJECT {"data": ["series_names"]} ONLY if chart has multiple named series
- series: ARRAY of objects with type "${actualSeriesType}"
- For ${chartType} charts: ${this.getChartSpecificRules(chartType)}

AXIS RULES:
- xAxis and yAxis must be OBJECTS, never arrays
- For line charts: data should be simple numbers array [150, 230, 224]
- NOT coordinate pairs like [[x,y], [x,y]]
- For sankey, pie, funnel, gauge, treemap, sunburst, map charts: NO xAxis or yAxis needed

LEGEND RULES:
- ONLY include legend if chart has multiple named series (2+ series with names)
- NEVER include legend for: heatmap, scatter, treemap, sunburst, sankey, map, boxplot, parallel, or any single series chart
- If only 1 series exists: NO legend property at all
- Legend data must match actual series names

${chartType === 'map' ? 'MAP CHART CRITICAL RULES:\n- ABSOLUTELY NO "mapType" property - use "map" instead\n- ABSOLUTELY NO "legend" property\n- ABSOLUTELY NO "xAxis" or "yAxis" properties\n- ALWAYS include "visualMap" for color coding data values\n- Data format: [{"name": "CountryName", "value": number}]\n- Generate realistic geographic data relevant to user query\n- Use "world" as default map value\n- Include tooltip with proper formatting\n- Enable roam for user interaction' : ''}

${areaChartNote ? 'AREA CHART: Use series type "line" with areaStyle property' : ''}

Create realistic data matching user requirements. Generate professional, valid ECharts JSON only.`;

    if (example && Object.keys(example).length > 0) {
      systemPrompt += `\n\nEXAMPLE STRUCTURE (use different data):
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
    return `CREATE CHART REQUEST - ${chartType.toUpperCase()}

 CHART SPECIFICATIONS:
 Chart Type: ${chartType}${variation ? `\n Variation: ${variation}` : ''}
 User Requirements: "${query}"

 IMPLEMENTATION REQUIREMENTS:
 Generate realistic sample data that matches the context
 Include meaningful titles and axis labels
 Ensure proper data visualization best practices
 Create professional and visually appealing design${chartType === 'area' ? '\n Use line series with areaStyle for area chart visualization' : ''}

 EXPECTED OUTPUT:
A complete ECharts configuration in valid JSON format that accurately represents the described data scenario and follows all chart type specifications.`;
  }

  private extractJsonFromContent(content: string): string {
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch?.[1]) {
      return codeBlockMatch[1].trim();
    }

    const directMatch = content.match(/(\{[\s\S]*\})/);
    if (directMatch?.[1]) {
      return directMatch[1].trim();
    }

    return content.trim();
  }

  private tryAlternativeJsonExtraction(content: string): string | null {
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return content.substring(firstBrace, lastBrace + 1);
    }
    return null;
  }


  private getChartSpecificRules(chartType: string): string {
    const rules = {
      pie: 'NO xAxis or yAxis needed, only series with data array',
      funnel: 'NO xAxis or yAxis needed, only series with data array',
      gauge: 'NO xAxis or yAxis needed, include progress and detail objects',
      graph: 'include layout, data, and links properties in series',
      radar: 'include indicator array for radar dimensions',
      sankey: 'NO xAxis, yAxis, or legend needed - only series with data (nodes) and links arrays',
      treemap: 'NO legend needed, include data array with hierarchical structure',
      sunburst: 'NO legend needed, include data array with hierarchical structure',
      heatmap: 'NO legend property allowed, NO series names needed - use xAxis and yAxis for categories, data format: [[x,y,value]]',
      boxplot: 'NO legend property allowed, include xAxis and yAxis as OBJECTS, data format: array of 5-number summaries [[min,Q1,median,Q3,max]]',
      parallel: 'NO xAxis, yAxis, or legend needed - use parallelAxis array to define dimensions and series with coordinate data format [[dim0,dim1,dim2...]]',
      line: 'xAxis and yAxis as OBJECTS (not arrays), data as simple numbers [150,230,224]',
      bar: 'xAxis and yAxis as OBJECTS (not arrays), data as simple numbers [150,230,224]',
      area: 'xAxis and yAxis as OBJECTS (not arrays), data as simple numbers [150,230,224]',
      map: 'NO xAxis, yAxis, or legend needed - use ONLY "map" property NEVER "mapType", include visualMap for data range, data format: [{"name": "Country", "value": number}], generate realistic geographic data based on user query'
    };
    return rules[chartType as keyof typeof rules] || 'include appropriate xAxis and yAxis as OBJECTS';
  }

}
