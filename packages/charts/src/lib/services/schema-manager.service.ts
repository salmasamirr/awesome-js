import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

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
        const variationSchemaPath = `${this.basePath}/${chartType}/${variation}/example.json`;
        const variationSchema = await this.safeLoadJson(variationSchemaPath);
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
          const merged = { ...typeExample, ...variationExample };
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
      const result = await lastValueFrom(
        this.http.get<any>(path, { 
          observe: 'response',
          reportProgress: false 
        }).pipe(
          map(response => response.body),
          catchError((error) => {
            if (error.status === 404 || error.status === 0) {
              return of({});
            }
            return of({});
          })
        )
      );
      return result || {};
    } catch (err) {
      return {};
    }
  }

  private concatSchemas(schemas: any[]): any {
    if (schemas.length === 0) return {};
    if (schemas.length === 1) return schemas[0];

    const merged = { ...schemas[0] };

    for (let i = 1; i < schemas.length; i++) {
      Object.assign(merged, schemas[i]);
    }

    return merged;
  }

  private chartTypesCache: string[] | null = null;
  private variationsCache: { [key: string]: string[] } = {};
  private manifestCache: any = null;

  async getAvailableChartTypes(): Promise<string[]> {
    if (this.chartTypesCache) {
      return this.chartTypesCache;
    }

    try {
      const manifest = await this.loadManifest();
      if (manifest && manifest.chartTypes && Array.isArray(manifest.chartTypes) && manifest.chartTypes.length > 0) {
        const chartTypes = manifest.chartTypes as string[];
        this.chartTypesCache = chartTypes;
        return chartTypes;
      }
    } catch (error) {
    }

    const commonChartTypes = [
      'area', 'bar', 'boxplot', 'candlestick', 'funnel',
      'gauge', 'graph', 'heatmap', 'line', 'map',
      'parallel', 'pie', 'radar', 'sankey', 'scatter',
      'sunburst', 'treemap'
    ];

    const availableTypes: string[] = [];

    const discoveryPromises = commonChartTypes.map(async (type) => {
      try {
        const schemaPath = `${this.basePath}/${type}/schema.json`;
        const schema = await this.safeLoadJson(schemaPath);
        if (schema && Object.keys(schema).length > 0) {
          return type;
        }
      } catch (error) {
      }
      return null;
    });

    const results = await Promise.all(discoveryPromises);
    this.chartTypesCache = results.filter((type): type is string => type !== null);
    
    return this.chartTypesCache;
  }

  async getAvailableVariations(chartType: string): Promise<string[]> {
    if (this.variationsCache[chartType]) {
      return this.variationsCache[chartType];
    }

    try {
      const manifest = await this.loadManifest();
      if (manifest && manifest.variations && manifest.variations[chartType]) {
        const variations = manifest.variations[chartType];
        if (Array.isArray(variations) && variations.length > 0) {
          this.variationsCache[chartType] = variations;
          return variations;
        }
      }
    } catch (error) {
    }

    const variations: string[] = [];

    const chartTypeVariations: { [key: string]: string[] } = {
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

    const potentialVariations = chartTypeVariations[chartType] || [];

    const discoveryPromises = potentialVariations.map(async (variationName) => {
      try {
        const variationPath = `${this.basePath}/${chartType}/${variationName}/example.json`;
        const schema = await this.safeLoadJson(variationPath);
        if (schema && Object.keys(schema).length > 0) {
          return variationName;
        }
      } catch (error) {
      }
      return null;
    });

    const results = await Promise.all(discoveryPromises);
    const discoveredVariations = results.filter((variation): variation is string => variation !== null);

    this.variationsCache[chartType] = discoveredVariations;
    return discoveredVariations;
  }

  private async loadManifest(): Promise<any> {
    if (this.manifestCache !== null) {
      return this.manifestCache;
    }

    try {
      const manifestPath = `${this.basePath}/manifest.json`;
      const manifest = await this.safeLoadJson(manifestPath);
      this.manifestCache = manifest && Object.keys(manifest).length > 0 ? manifest : null;
      return this.manifestCache;
    } catch (error) {
      this.manifestCache = null;
      return null;
    }
  }
}