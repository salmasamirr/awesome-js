import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { lastValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ValidationService {
  private ajv: Ajv;
  private baseSchema: any = null;
  private baseValidator: ValidateFunction | null = null;
  private readonly basePath = 'assets/echarts';
  private initializationPromise: Promise<void> | null = null;

  constructor(private http: HttpClient) {
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
      validateSchema: false,
      removeAdditional: false
    });
    addFormats(this.ajv);
  }

  private async initializeBaseSchema(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        this.baseSchema = await this.loadBaseSchema();

        if (!this.baseSchema || Object.keys(this.baseSchema).length === 0) {
          throw new Error('Base schema is empty or not found');
        }

        this.baseValidator = this.ajv.compile(this.baseSchema);
      } catch (error) {
        console.error('CRITICAL: Failed to load base schema', error);
        throw new Error('Cannot initialize validation service: ' + error);
      }
    })();

    return this.initializationPromise;
  }

  private async loadBaseSchema(): Promise<any> {
    const basePath = `${this.basePath}/base/base.json`;

    try {
      const result = await lastValueFrom(
        this.http.get<any>(basePath).pipe(
          catchError((error) => {
            throw new Error(`Base schema file not found: ${basePath}`);
          })
        )
      );

      if (!result || Object.keys(result).length === 0) {
        throw new Error('Base schema file is empty');
      }

      return result;
    } catch (error) {
      console.error('Failed to load base schema:', error);
      throw error;
    }
  }

  extractJSON(response: any): any {
    if (!response) return null;

    try {
      const rawData = response.response || response;
      return typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    } catch (error) {
      console.error('JSON parsing failed:', error);
      return null;
    }
  }

  async validateResponse(response: any, schema?: any): Promise<{ valid: boolean; data?: any; error?: string }> {
    if (!this.baseSchema || !this.baseValidator) {
      try {
        await this.initializeBaseSchema();
      } catch (error) {
        return {
          valid: false,
          error: `Validation service not initialized: ${error}`,
          data: null
        };
      }
    }

    const data = this.extractJSON(response);

    if (!data) {
      return { valid: false, error: 'Invalid JSON response', data: null };
    }

    if (!data.series || !Array.isArray(data.series) || data.series.length === 0) {
      return { valid: false, error: 'Missing or invalid series array', data };
    }

    const hasValidSeries = data.series.some((series: any) => {
      const isValid = series && (series.data !== undefined);
      return isValid;
    });

    if (!hasValidSeries) {
      return { valid: false, error: 'No valid series found with data', data };
    }

    // Fix for LLM not following schema: Add default title if empty
    if (!data.title || (typeof data.title === 'object' && Object.keys(data.title).length === 0)) {
      data.title = { text: 'Map Chart' };
      console.warn('LLM returned empty title, using default');
    }
    
    // Ensure title has text property
    if (data.title && typeof data.title === 'object' && !data.title.text) {
      data.title.text = 'Map Chart';
      console.warn('LLM returned title without text, adding default');
    }

    let validator = this.baseValidator!;

    if (schema && Object.keys(schema).length > 0) {
      try {
        const cleanSchema = this.cleanSchemaForValidation(schema);

        const mergedSchema = {
          ...this.baseSchema,
          ...cleanSchema,
          properties: {
            ...this.baseSchema.properties,
            ...(cleanSchema.properties || {})
          }
        };

        if (mergedSchema.required) {
          mergedSchema.required = ['series'];
        }

        if (mergedSchema.properties?.series?.items?.properties?.type) {
          const typeProp = mergedSchema.properties.series.items.properties.type;
          if (typeProp && typeProp.const) {
            mergedSchema.properties.series.items.properties.type = {
              type: 'string'
            };
          }
        }

        delete mergedSchema.allOf;
        delete mergedSchema.$ref;
        delete mergedSchema.anyOf;
        delete mergedSchema.oneOf;
        
        const schemaId = mergedSchema.$id || mergedSchema.id;
        if (schemaId && this.ajv.getSchema(schemaId)) {
          this.ajv.removeSchema(schemaId);
        }

        validator = this.ajv.compile(mergedSchema);
      } catch (error) {
        console.warn('Schema compilation failed, using base validator:', error);
      }
    }

    try {
      const valid = validator(data);

      if (!valid) {
        const criticalErrors = validator.errors?.filter(err => {
          const path = err.instancePath || err.schemaPath || '';
          const message = err.message || '';
          if (path.includes('title') && message.includes('must be string')) {
            return false;
          }
          if (err.keyword === 'required' && path.includes('optional')) {
            return false;
          }
          if ((path === '/xAxis' || path === '/yAxis') && message.includes('must be object')) {
            return false;
          }
          if ((path.includes('xAxis') || path.includes('yAxis')) && err.keyword === 'type') {
            return false;
          }

          return true;
        }) || [];

        if (criticalErrors.length === 0) {
          return { valid: true, data };
        }

        const criticalErrorMsg = criticalErrors.map(err =>
          `${err.instancePath || err.schemaPath} ${err.message}`
        ).join(', ');
        return { valid: false, error: `Validation errors: ${criticalErrorMsg}`, data };
      }

      return { valid: true, data };
    } catch (validationError) {
      return { valid: false, error: 'Validation error occurred', data };
    }
  }

  private cleanSchemaForValidation(schema: any): any {
    if (!schema || typeof schema !== 'object') {
      return {};
    }

    const cleaned: any = {};

    if (schema.type) cleaned.type = schema.type;
    if (schema.title) cleaned.title = schema.title;

    if (schema.properties) {
      cleaned.properties = { ...schema.properties };
    }

    if (schema.allOf && Array.isArray(schema.allOf)) {
      if (!cleaned.properties) cleaned.properties = {};

      schema.allOf.forEach((item: any) => {
        if (item.$ref) {
          return;
        }
        if (item.properties) {
          Object.assign(cleaned.properties, item.properties);
        }
      });
    }

    if (schema.required && Array.isArray(schema.required)) {
      cleaned.required = [...schema.required];
    }

    return cleaned;
  }
}