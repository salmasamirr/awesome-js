import { Injectable } from '@angular/core';

export interface ChartExample {
  title: string;
  description: string;
  data: any;
}

export interface ChartSchema {
  type: string;
  schema: any;
  examples: ChartExample[];
}

@Injectable({ providedIn: 'root' })
export class SchemaManagerService {
  private schemas: Map<string, ChartSchema> = new Map();

  constructor() {
    this.initializeSchemas();
  }

  private initializeSchemas() {
    // Initialize with core chart types only
    const chartTypes = [
      'bar', 'line', 'pie', 'scatter', 'radar', 'gauge', 'area'
    ];

    chartTypes.forEach(type => {
      this.loadChartSchema(type);
    });
  }

  private loadChartSchema(chartType: string) {
    this.schemas.set(chartType, {
      type: chartType,
      schema: this.getFallbackSchema(chartType),
      examples: this.getFallbackExamples(chartType)
    });
  }

  private getFallbackSchema(chartType: string): any {
    const baseSchema: any = {
      type: "object",
      properties: {
        title: { type: "object", properties: { text: { type: "string" } } },
        series: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              data: { type: "array" }
            },
            required: ["type", "data"]
          }
        }
      },
      required: ["series"]
    };

    // Add chart-specific properties
    switch (chartType) {
      case 'bar':
        baseSchema.properties.xAxis = { type: "object", properties: { data: { type: "array" } } };
        baseSchema.properties.yAxis = { type: "object" };
        break;
      case 'line':
        baseSchema.properties.xAxis = { type: "object", properties: { type: { type: "string" }, data: { type: "array" } } };
        baseSchema.properties.yAxis = { type: "object", properties: { type: { type: "string" } } };
        break;
      case 'pie':
        // Pie charts don't need xAxis/yAxis
        break;
    }

    return baseSchema;
  }

  private getFallbackExamples(chartType: string): ChartExample[] {
    switch (chartType) {
      case 'bar':
        return [{
          title: "Basic Bar Chart",
          description: "A simple bar chart showing daily sales data",
          data: {
            title: { text: "Daily Sales" },
            xAxis: { data: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
            yAxis: {},
            series: [{ type: "bar", data: [120, 200, 150, 80, 70] }]
          }
        }];
      
      case 'line':
        return [{
          title: "Basic Line Chart",
          description: "A simple line chart showing trend data",
          data: {
            title: { text: "Sales Trend" },
            xAxis: { type: "category", data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
            yAxis: { type: "value" },
            series: [{ type: "line", data: [150, 230, 224, 218, 135, 147, 260] }]
          }
        }];
      
      case 'pie':
        return [{
          title: "Basic Pie Chart",
          description: "A simple pie chart showing data distribution",
          data: {
            title: { text: "Data Distribution" },
            series: [{
              type: "pie",
              data: [
                { value: 1048, name: "Search Engine" },
                { value: 735, name: "Direct" },
                { value: 580, name: "Email" },
                { value: 484, name: "Union Ads" },
                { value: 300, name: "Video Ads" }
              ]
            }]
          }
        }];
      
      case 'scatter':
        return [{
          title: "Basic Scatter Chart",
          description: "A simple scatter chart showing correlation data",
          data: {
            title: { text: "Correlation Analysis" },
            xAxis: { type: "value" },
            yAxis: { type: "value" },
            series: [{
              type: "scatter",
              data: [[10, 20], [20, 30], [30, 40], [40, 50], [50, 60]]
            }]
          }
        }];
      
      case 'gauge':
        return [{
          title: "Basic Gauge Chart",
          description: "A simple gauge chart showing a single value",
          data: {
            title: { text: "Performance Gauge" },
            series: [{
              type: "gauge",
              data: [{ value: 75, name: "Performance" }]
            }]
          }
        }];
      
      default:
        return [{
          title: `Basic ${chartType} Chart`,
          description: `A simple ${chartType} chart`,
          data: {
            title: { text: `${chartType} Chart` },
            series: [{ type: chartType, data: [] }]
          }
        }];
    }
  }

  getChartSchema(chartType: string): ChartSchema | undefined {
    return this.schemas.get(chartType);
  }

  getAllChartTypes(): string[] {
    return Array.from(this.schemas.keys());
  }

  getSchemaAndExample(chartType: string): { schema: any; example: any } | null {
    const chartSchema = this.getChartSchema(chartType);
    
    if (!chartSchema || chartSchema.examples.length === 0) {
      return null;
    }

    return {
      schema: chartSchema.schema,
      example: chartSchema.examples[0].data
    };
  }

  generatePromptWithSchema(userMessage: string, chartType: string): string {
    const schemaData = this.getSchemaAndExample(chartType);
    
    if (!schemaData) {
      return userMessage;
    }

    const { schema, example } = schemaData;
    
    // Add chart-specific instructions
    let chartSpecificInstruction = '';
    switch (chartType) {
      case 'bar':
        chartSpecificInstruction = 'Create a BAR CHART with categories on x-axis and values on y-axis.';
        break;
      case 'line':
        chartSpecificInstruction = 'Create a LINE CHART showing trends over time.';
        break;
      case 'pie':
        chartSpecificInstruction = 'Create a PIE CHART showing data distribution with percentages.';
        break;
      case 'scatter':
        chartSpecificInstruction = 'Create a SCATTER PLOT showing correlation between two variables.';
        break;
      case 'radar':
        chartSpecificInstruction = 'Create a RADAR CHART showing multiple dimensions.';
        break;
      case 'gauge':
        chartSpecificInstruction = 'Create a GAUGE CHART showing a single value.';
        break;
      case 'area':
        chartSpecificInstruction = 'Create an AREA CHART showing filled areas under lines.';
        break;
    }

    return `You are an ECharts expert. Generate a ${chartType.toUpperCase()} CHART for: "${userMessage}"

REQUIREMENTS:
- Chart type: ${chartType.toUpperCase()}
- ${chartSpecificInstruction}
- Series type must be exactly "${chartType}"
- Follow the example structure below

Schema: ${JSON.stringify(schema)}
Example: ${JSON.stringify(example)}

CRITICAL: 
- The series[0].type must be "${chartType}"
- Use the exact structure from the example
- Return ONLY valid JSON, no text
- Do not use any other chart types

Return ONLY valid JSON, no text.`;
  }
}
