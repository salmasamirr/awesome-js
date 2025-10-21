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
      // Load base schema
      const base = await this.safeLoadJson(`${this.basePath}/base/base.json`);
      if (Object.keys(base).length > 0) {
        schemas.push(base);
      }

      // Load chart type schema
      const typeSchema = await this.safeLoadJson(`${this.basePath}/${chartType}/schema.json`);
      if (Object.keys(typeSchema).length > 0) {
        schemas.push(typeSchema);
      }

      // Load variation schema if provided
      if (variation) {
        const variationSchema = await this.safeLoadJson(`${this.basePath}/${chartType}/${variation}/schema.json`);
        if (Object.keys(variationSchema).length > 0) {
          schemas.push(variationSchema);
        }
      }

      return this.concatSchemas(schemas);
    } catch (error) {
      console.error('Error loading combined schema:', error);
      return {};
    }
  }

  async loadExample(chartType: string, variation?: string): Promise<any> {
    // Always try to load the base example for the chart type
    const typeExample = await this.safeLoadJson(`${this.basePath}/${chartType}/example.json`);

    // If a variation is provided, load it and deep-merge so that
    // the variation overrides the base example where needed
    if (variation) {
      const variationExample = await this.safeLoadJson(`${this.basePath}/${chartType}/${variation}/example.json`);

      // If both are non-empty objects, merge; otherwise return the non-empty one
      if (Object.keys(typeExample).length > 0 && Object.keys(variationExample).length > 0) {
        const merged = { ...typeExample };
        this.deepMerge(merged, variationExample);
        return merged;
      }

      return Object.keys(variationExample).length > 0 ? variationExample : typeExample;
    }

    return typeExample;
  }

  /**
   * Load a JSON file and parse it
   */
  private async safeLoadJson(path: string): Promise<any> {
    try {
      console.log('Loading JSON from:', path);
      const result = await lastValueFrom(this.http.get<any>(path));
      console.log('Successfully loaded:', path, result);
      return result;
    } catch (err) {
      console.warn(`SchemaManagerService: Failed to load ${path}, returning {}`);
      return {};
    }
  }

  /**
   * Concatenate multiple schemas into one
   * This method ensures no duplicate attributes by merging properties intelligently
   */
  private concatSchemas(schemas: any[]): any {
    if (schemas.length === 0) return {};
    if (schemas.length === 1) return schemas[0];

    const merged = { ...schemas[0] };

    for (let i = 1; i < schemas.length; i++) {
      this.deepMerge(merged, schemas[i]);
    }

    return merged;
  }

  /**
   * Deep merge objects while avoiding duplicate attributes
   * Later schemas override earlier ones for conflicting properties
   */
  private deepMerge(target: any, source: any): void {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
            target[key] = {};
          }
          this.deepMerge(target[key], source[key]);
        } else {
          // Override with source value to avoid duplicates
          target[key] = source[key];
        }
      }
    }
  }

  getAvailableChartTypes(): string[] {
    return [
      'area', 'bar', 'boxplot', 'candlestick', 'funnel', 
      'gauge', 'graph', 'heatmap', 'line', 'map', 
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