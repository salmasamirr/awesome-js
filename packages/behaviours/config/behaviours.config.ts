import { InjectionToken } from '@angular/core';

export interface BehavioursConfig {
  path: string;
  baseURL?: string;
  prefix: string;
  canActivate?: any[];
}

export const BEHAVIOURS_CONFIG = new InjectionToken<BehavioursConfig>('BehavioursConfig');