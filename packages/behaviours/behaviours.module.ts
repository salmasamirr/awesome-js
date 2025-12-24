import { NgModule, ModuleWithProviders, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Behaviours } from 'ng-behaviours';
import { BehaviouralDirective } from './directives/behavioural.directive';
import {BehavioursConfig, BEHAVIOURS_CONFIG} from './config/behaviours.config';


export function getBehaviours(http: HttpClient): Behaviours {
  const config = inject(BEHAVIOURS_CONFIG);

  if (!config?.prefix) {
    throw new Error(
      '[BEHAVIOURS_CONFIG] prefix is required to create Behaviours URL'
    );
  }

  const base = config.baseURL;
  const prefix = config.prefix;

  let fullURL = prefix;

  if (base) {
    fullURL = new URL(prefix, base).href;
  }

  return new Behaviours(http, fullURL);
}

@NgModule({
  declarations: [
    BehaviouralDirective
  ],
  imports: [
    CommonModule,
    HttpClientModule
  ],
  exports: [
    BehaviouralDirective
  ],
  providers: [
    {
      provide: Behaviours,
      useFactory: getBehaviours,
      deps: [HttpClient],
    },
  ]
})
export class BehavioursModule {
  static config(
    config: BehavioursConfig
  ): ModuleWithProviders<BehavioursModule> {
    return {
      ngModule: BehavioursModule,
      providers: [
        { provide: BEHAVIOURS_CONFIG, useValue: config }
      ]
    };
  }
}