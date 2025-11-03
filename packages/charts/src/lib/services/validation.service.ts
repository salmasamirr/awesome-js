import { Injectable } from '@angular/core';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

@Injectable({ providedIn: 'root' })
export class ValidationService {
  private ajv: Ajv;
  private baseSchema: any = {
    type: 'object',
    properties: {
      title: { type: 'object' },
      tooltip: { type: 'object' },
      legend: { type: 'object' },
      grid: { type: 'object' },
      xAxis: { type: 'object' },
      yAxis: { type: 'object' },
      series: {
        type: 'array',
        items: {
          type: 'object',
          required: ['type', 'data'],
          properties: {
            type: { type: 'string' },
            data: { 
              type: 'array',
              items: {}
            }
          }
        }
      }
    },
    required: ['series']
  };
  private baseValidator: ValidateFunction;

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true, 
      strict: false,
      validateSchema: false,
      removeAdditional: false
    });
    addFormats(this.ajv);
    this.baseValidator = this.ajv.compile(this.baseSchema);
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

  extractJSON(response: any): any {
    if (!response) return null;
    
    try {
      const rawData = response.response || response;
      return typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    } catch (error) {
      console.warn('JSON parsing failed:', error);
      return null;
    }
  }

  validateResponse(response: any, schema?: any): { valid: boolean; data?: any; error?: string } {
    const data = this.extractJSON(response);
    
    if (!data) {
      return { valid: false, error: 'Invalid JSON response', data: null };
    }

    if (!data.series || !Array.isArray(data.series) || data.series.length === 0) {
      return { valid: false, error: 'Missing or invalid series array', data };
    }

    const hasValidSeries = data.series.some((series: any) => 
      series && (series.data || Array.isArray(series.data))
    );
    
    if (!hasValidSeries) {
      return { valid: false, error: 'No valid series found with data', data };
    }

    let validator = this.baseValidator;
    
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
        
        validator = this.ajv.compile(mergedSchema);
      } catch (error) {
        console.warn('Schema compilation failed, using base validator:', error);
      }
    }

    try {
      const valid = validator(data);
      
      if (!valid) {
        const errors = validator.errors?.map(err => 
          `${err.instancePath || err.schemaPath} ${err.message}`
        ).join(', ') || 'Schema validation failed';
        
        const criticalErrors = validator.errors?.filter(err => {
          const path = err.instancePath || err.schemaPath || '';
          const message = err.message || '';
          if (path.includes('title') && message.includes('must be string')) {
            return false;
          }
          if (err.keyword === 'required' && path.includes('optional')) {
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
        return { valid: false, error: `Validation warnings: ${criticalErrorMsg}`, data };
      }
      
      return { valid: true, data };
    } catch (validationError) {
      console.warn('Validation error:', validationError);
      return { valid: false, error: 'Validation error occurred', data };
    }
  }
}