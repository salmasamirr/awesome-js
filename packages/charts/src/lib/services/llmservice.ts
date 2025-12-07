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



  generateChartOptions(query: string, chartType: string = 'bar', variation?: string): Observable<any> {
    const schemaPromise = Promise.all([
      this.schemaManager.loadCombinedSchema(chartType, variation),
      this.schemaManager.loadExample(chartType, variation)
    ]);

    return from(schemaPromise).pipe(
      switchMap(([schema, example]) => {
        const messages = this.generatePrompt(query, chartType, variation, schema, example);
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
              return throwError(() => new Error('Cannot connect to LM Studio. Please ensure LM Studio is running on http://localhost:1234 and a model is loaded. Check if CORS is enabled in LM Studio settings.'));
            } else if (error.status === 404) {
              return throwError(() => new Error('LM Studio endpoint not found. Please check if LM Studio is running with the correct API endpoint.'));
            } else if (error.status === 500) {
              return throwError(() => new Error('LM Studio internal error. Please check if a model is properly loaded.'));
            } else if (error.status === 422) {
              return throwError(() => new Error('Invalid request to LM Studio. The model name might be incorrect or the request format is wrong.'));
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

  private generatePrompt(query: string, chartType: string, variation?: string, schema?: any, example?: any): any[] {
    const messages: any[] = [];

    const actualSeriesType = chartType === 'area' ? 'line' : chartType;
    const areaChartNote = chartType === 'area' ? '\nIMPORTANT: For area charts, use series type "line" with areaStyle property.' : '';

    let systemPrompt = `You are an ECharts expert. Generate ONLY valid JSON configuration for "${chartType}" chart.${chartType === 'scatter' ? '\n\n🚨 SCATTER CHART CRITICAL WARNING:\n- NEVER return empty title object like {"title": {}}\n- ALWAYS include complete title: {"title": {"text": "Meaningful Chart Title"}}\n- FORBIDDEN: tooltip, legend properties\n- REQUIRED: proper axis labels and coordinate pair data [[x,y], [x,y]]' : ''}

STRICT JSON FORMAT RULES:
- Return ONLY JSON object starting with { and ending with }
- NO explanations, comments, or text outside JSON
- NO schema properties like $schema, $id, properties, required
- NO markdown code blocks or backticks

CRITICAL PROPERTY FORMATS:
- title: OBJECT {"text": "..."} NEVER array - ALWAYS include meaningful title text
- xAxis: OBJECT (not array) like {"type": "category", "data": [...]}
- yAxis: OBJECT (not array) like {"type": "value"}
- series: ARRAY of objects with type "${actualSeriesType}"

MANDATORY PROPERTIES - ALWAYS INCLUDE:
- title: MUST have "text" property with meaningful chart title
- xAxis: MUST be object (not array)
- yAxis: MUST be object (not array)
- series: MUST be array with proper data format

OPTIONAL PROPERTIES (only include when explicitly needed):
- legend: OBJECT {"data": ["series_names"]} ONLY for multi-series charts with names
- For ${chartType} charts: ${this.getChartSpecificRules(chartType)}${chartType === 'radar' ? '\n\nRADAR CHART AXIS OPTIMIZATION:\n- Use round numbers for max values (100, 500, 1000, 5000, 10000)\n- Avoid irregular max values that cause tick readability issues\n- Choose max values that allow clean division by 5-10 tick marks' : ''}

FORBIDDEN PROPERTIES - NEVER INCLUDE:
- tooltip (will be added automatically)
- toolbox (not needed)
- calculable (deprecated)
- normal (deprecated style hierarchy)
- textStyle (deprecated, use label properties directly)
- emphasis (use modern format)

AXIS RULES:
- xAxis and yAxis must be OBJECTS, never arrays
- For line charts: data should be simple numbers array [150, 230, 224]
- NOT coordinate pairs like [[x,y], [x,y]]
- For sankey, pie, funnel, gauge, treemap, sunburst, map charts: NO xAxis or yAxis needed

LEGEND RULES - STRICT COMPLIANCE REQUIRED:
- NEVER include legend property for: scatter, heatmap, treemap, sunburst, sankey, map, boxplot, parallel
- SCATTER CHARTS: FORBIDDEN to include legend property - omit completely
- Single series charts: NO legend property 
- ONLY add legend when: multiple series (2+) with different names exist
- Legend data must exactly match series names when used

${chartType === 'map' ? 'MAP CHART CRITICAL RULES:\n- ABSOLUTELY NO "mapType" property - use "map" instead\n- ABSOLUTELY NO "legend" property\n- ABSOLUTELY NO "xAxis" or "yAxis" properties\n- ALWAYS include "visualMap" for color coding data values\n- Data format: [{"name": "CountryName", "value": number}]\n- Generate realistic geographic data relevant to user query\n- Use "world" as default map value\n- Include tooltip with proper formatting\n- Enable roam for user interaction' : ''}

${chartType === 'heatmap' ? 'HEATMAP CHART CRITICAL RULES:\n- ABSOLUTELY REQUIRED: xAxis, yAxis, visualMap, and series\n- ABSOLUTELY NO "legend" property\n- Data format: [[x_index, y_index, value], [x_index, y_index, value], ...]\n- xAxis and yAxis must have "type": "category" and "data" arrays\n- visualMap must have min, max, and calculable properties\n- Generate realistic data with proper x,y,value coordinates' : ''}

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
      radar: 'include indicator array for radar dimensions with proper min/max values that avoid axis tick warnings',
      sankey: 'NO xAxis, yAxis, or legend needed - only series with data (nodes) and links arrays',
      treemap: 'NO legend needed, include data array with hierarchical structure',
      sunburst: 'NO legend needed, include data array with hierarchical structure',
      heatmap: 'REQUIRED: xAxis, yAxis, visualMap properties - use xAxis and yAxis for categories, data format: [[x,y,value]]',
      boxplot: 'NO legend property allowed, include xAxis and yAxis as OBJECTS, data format: array of 5-number summaries [[min,Q1,median,Q3,max]]',
      parallel: 'NO xAxis, yAxis, or legend needed - use parallelAxis array to define dimensions and series with coordinate data format [[dim0,dim1,dim2...]]',
      line: 'xAxis and yAxis as OBJECTS (not arrays), data as simple numbers [150,230,224]',
      bar: 'xAxis and yAxis as OBJECTS (not arrays), data as simple numbers [150,230,224]',
      area: 'xAxis and yAxis as OBJECTS (not arrays), data as simple numbers [150,230,224]',
      scatter: `SCATTER CHART ABSOLUTE RULES:
- NO legend property (strictly forbidden)
- MANDATORY: title with meaningful text like "Data Scatter Chart"
- xAxis and yAxis MUST be OBJECTS with proper labels
- Data MUST be coordinate pairs ONLY: [[x,y], [x,y], ...]
- NEVER use single-value arrays like [10,20,30]
- NEVER use objects like {x:10, y:20}
- Include reasonable symbolSize automatically`,
      map: 'NO xAxis, yAxis, or legend needed - use ONLY "map" property NEVER "mapType", include visualMap for data range, data format: [{"name": "Country", "value": number}], generate realistic geographic data based on user query'
    };
    return rules[chartType as keyof typeof rules] || 'include appropriate xAxis and yAxis as OBJECTS';
  }

}
