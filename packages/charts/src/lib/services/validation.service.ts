import { Injectable } from '@angular/core';
import Ajv from 'ajv';
import { SchemaManagerService } from './schema-manager.service';

@Injectable({ providedIn: 'root' })
export class ValidationService {
  private ajv: Ajv;

  constructor(private schemaManager: SchemaManagerService) {
    this.ajv = new Ajv({ 
      allErrors: true, 
      strict: false,
      validateSchema: false // Keep false for performance
    });
  }

  // Keep existing - it's fine
  extractJSON(response: any): any {
    try {
      const raw = response?.response ?? response;
      if (typeof raw === 'string') return JSON.parse(raw);
      if (raw && typeof raw.data === 'string') return JSON.parse(raw.data);
      return raw;
    } catch {
      return null;
    }
  }

  // ✅ FIXED: Only one validation method needed
  async validateResponse(
    response: any,
    chartType?: string,
    variation?: string,
    schema?: any // Optional: can pass schema directly
  ): Promise<{ valid: boolean; data?: any; error?: string }> {
    
    // 1. Extract JSON
    const data = this.extractJSON(response);
    if (!data) return { valid: false, error: 'Invalid JSON response' };

    // 2. Basic manual checks
    if (!Array.isArray(data.series) || data.series.length === 0) {
      return { valid: false, error: 'Missing series array', data };
    }

    const hasValidData = data.series.some((s: any) => s && s.data !== undefined);
    if (!hasValidData) {
      return { valid: false, error: 'Series contains no data field', data };
    }

    // 3. Get schema (either from params or SchemaManager)
    let validationSchema = schema;
    
    if (!validationSchema && chartType) {
      try {
        validationSchema = await this.schemaManager.loadCombinedSchema(chartType, variation);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { 
          valid: false, 
          error: `Failed to load schema: ${errorMessage}`, 
          data 
        };
      }
    }

    // 4. If no schema, basic checks passed
    if (!validationSchema || Object.keys(validationSchema).length === 0) {
      return { valid: true, data };
    }

    // 5. Validate with AJV
    try {
      // Ensure schema has ID
      const schemaId = validationSchema.$id || validationSchema.id || 'dynamic-schema';
      
      // Use existing validator if available
      let validator = this.ajv.getSchema(schemaId);
      if (!validator) {
        validator = this.ajv.compile(validationSchema);
      }

      const isValid = validator(data);
      
      if (!isValid) {
        const errors = validator.errors || [];
        
        if (errors.length === 0) {
          return { valid: false, error: 'Validation failed', data };
        }
        
        // Format errors clearly
        const errorMessages = errors.map(err => {
          const path = err.instancePath || 'chart';
          const message = err.message || 'Invalid';
          return `${path}: ${message}`;
        });
        
        return { 
          valid: false, 
          error: errorMessages.join('; '), 
          data 
        };
      }
      
      return { valid: true, data };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { 
        valid: false, 
        error: `Validation failed: ${errorMessage}`,
        data 
      };
    }
  }

  // ✅ OPTIONAL: Keep old signature for compatibility
  async validateWithSchema(
    response: any,
    schema: any
  ): Promise<{ valid: boolean; data?: any; error?: string }> {
    return this.validateResponse(response, undefined, undefined, schema);
  }
}