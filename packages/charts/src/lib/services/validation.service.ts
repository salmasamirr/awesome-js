import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ValidationService {

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

  validateBasicStructure(data: any): boolean {
    if (!data) return false;

    if (!data.series || !Array.isArray(data.series)) return false;
    
    return data.series.every((series: any) => 
      series && typeof series.type === 'string' && Array.isArray(series.data)
    );
  }

  validateResponse(response: any): { valid: boolean; data?: any; error?: string } {
    const data = this.extractJSON(response);
    
    if (!data) {
      return { valid: false, error: 'Invalid JSON response' };
    }
    
    if (!this.validateBasicStructure(data)) {
      return { valid: false, error: 'Missing required chart structure', data };
    }
    
    return { valid: true, data };
  }
}