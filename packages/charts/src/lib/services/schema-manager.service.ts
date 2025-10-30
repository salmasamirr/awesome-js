import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SchemaManagerService {
  private readonly basePath = 'assets/echarts';

  constructor(private http: HttpClient) { }

  async loadCombinedSchema(chartType: string, variation?: string): Promise<any> {
    const schemas: any[] = [];

    try {
      const basePath = `${this.basePath}/base/base.json`;
      const base = await this.safeLoadJson(basePath);
      if (Object.keys(base).length > 0) {
        schemas.push(base);
      }

      const typePath = `${this.basePath}/${chartType}/schema.json`;
      const typeSchema = await this.safeLoadJson(typePath);
      if (Object.keys(typeSchema).length > 0) {
        schemas.push(typeSchema);
      }

      if (variation) {
        const variationPath = `${this.basePath}/${chartType}/${variation}/example.json`;
        const variationSchema = await this.safeLoadJson(variationPath);
        if (Object.keys(variationSchema).length > 0) {
          schemas.push(variationSchema);
        }
      }

      const result = this.concatSchemas(schemas);
      return result;
    } catch (error) {
      return {};
    }
  }

  async loadExample(chartType: string, variation?: string): Promise<any> {
    try {
      const typeExamplePath = `${this.basePath}/${chartType}/example.json`;
      const typeExample = await this.safeLoadJson(typeExamplePath);

      if (variation) {
        const variationExamplePath = `${this.basePath}/${chartType}/${variation}/example.json`;
        const variationExample = await this.safeLoadJson(variationExamplePath);

        if (Object.keys(typeExample).length > 0 && Object.keys(variationExample).length > 0) {
          const merged = { ...typeExample };
          this.deepMerge(merged, variationExample);
          return merged;
        }

        const result = Object.keys(variationExample).length > 0 ? variationExample : typeExample;
        return result;
      }

      return typeExample;
    } catch (error) {
      return {};
    }
  }

  private async safeLoadJson(path: string): Promise<any> {
    try {
      const result = await lastValueFrom(this.http.get<any>(path));
      return result;
    } catch (err) {
      return {};
    }
  }

  private concatSchemas(schemas: any[]): any {
    if (schemas.length === 0) return {};
    if (schemas.length === 1) return schemas[0];

    const merged = { ...schemas[0] };

    for (let i = 1; i < schemas.length; i++) {
      this.deepMerge(merged, schemas[i]);
    }

    return merged;
  }

  private deepMerge(target: any, source: any): void {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
            target[key] = {};
          }
          this.deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
  }

  getAvailableChartTypes(): string[] {
    return [
      'area', 'bar', 'boxplot', 'candlestick', 'funnel',
      'gauge', 'graph', 'heatmap', 'line',
      'parallel', 'pie', 'radar', 'sankey', 'scatter',
      'sunburst', 'treemap'
    ];
  }

  getAvailableVariations(chartType: string): string[] {
    const variations: { [key: string]: string[] } = {
      'area': ['smooth', 'stacked', 'step'],
      'bar': ['horizontal', 'stacked', 'negative', 'racing', 'waterfall'],
      'boxplot': ['multiple'],
      'candlestick': ['candlestick-with-ma', 'candlestick-with-volume'],
      'funnel': ['comparison', 'sorted'],
      'gauge': ['dashboard', 'multi'],
      'graph': ['circular-graph', 'force-graph', 'graph-with-categories'],
      'heatmap': ['calendar-heatmap', 'geo-heatmap'],
      'line': ['line-area', 'line-smooth', 'line-stacked', 'line-step'],
      'map': ['china-map'],
      'parallel': ['parallel-with-multiple-lines'],
      'pie': ['doughnut(Ring)-pie', 'rose-pie', 'nested-pie'],
      'radar': ['filled-radar', 'multiple-radar'],
      'sankey': ['sankey-node-alignments'],
      'scatter': ['bubble-scatter', 'effect-scatter', 'large-scatter'],
      'sunburst': ['sunburst-with-levels', 'sunburst-with-radius'],
      'treemap': ['treemap-drilldown', 'treemap-with-levels']
    };

    return variations[chartType] || [];
  }
}