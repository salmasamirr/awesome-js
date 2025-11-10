import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SchemaManagerService {
  private readonly basePath = 'assets/echarts';
  private readonly manifestPath = `${this.basePath}/manifest.json`;

  private chartTypesCache: string[] | null = null;
  private variationsCache: { [key: string]: string[] } = {};
  private manifestCache: any = null;

  constructor(private http: HttpClient) { }

  private async loadManifest(): Promise<any> {
    if (this.manifestCache !== null) {
      return this.manifestCache;
    }

    try {
      const manifest = await this.safeLoadJson(this.manifestPath);
      if (manifest && Object.keys(manifest).length > 0) {
        this.manifestCache = manifest;
        return this.manifestCache;
      } else {
        console.warn('Manifest file is empty');
        this.manifestCache = {};
        return {};
      }
    } catch (error) {
      console.error('Manifest file not found or invalid:', error);
      this.manifestCache = {};
      return {};
    }
  }

  async getAvailableChartTypes(): Promise<string[]> {
    if (this.chartTypesCache) {
      return this.chartTypesCache;
    }

    const manifest = await this.loadManifest();
    
    if (!manifest?.chartTypes || !Array.isArray(manifest.chartTypes)) {
      console.warn('chartTypes not found in manifest, using empty array');
      this.chartTypesCache = [];
      return this.chartTypesCache;
    }

    this.chartTypesCache = manifest.chartTypes;
    return this.chartTypesCache ? this.chartTypesCache : [];
  }

  async getAvailableVariations(chartType: string): Promise<string[]> {
    if (this.variationsCache[chartType]) {
      return this.variationsCache[chartType];
    }

    const manifest = await this.loadManifest();
    
    if (!manifest?.variations || !manifest.variations[chartType]) {
      console.warn(`No variations found for chart type: ${chartType}`);
      this.variationsCache[chartType] = [];
      return [];
    }

    this.variationsCache[chartType] = manifest.variations[chartType];
    return this.variationsCache[chartType];
  }

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
      console.error('Error loading combined schema:', error);
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
      console.error('Error loading example:', error);
      return {};
    }
  }

  private async safeLoadJson(path: string): Promise<any> {
    try {
      const result = await lastValueFrom(
        this.http.get<any>(path, { 
          observe: 'response'
        }).pipe(
          map(response => response.body),
          catchError((error) => {
            if (error.status === 404) {
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

  clearCache(): void {
    this.chartTypesCache = null;
    this.variationsCache = {};
    this.manifestCache = null;
  }

  async getManifest(): Promise<any> {
    return await this.loadManifest();
  }

  async isValidChartType(chartType: string): Promise<boolean> {
    const availableTypes = await this.getAvailableChartTypes();
    return availableTypes.includes(chartType);
  }

  async isValidVariation(chartType: string, variation: string): Promise<boolean> {
    const availableVariations = await this.getAvailableVariations(chartType);
    return availableVariations.includes(variation);
  }
}