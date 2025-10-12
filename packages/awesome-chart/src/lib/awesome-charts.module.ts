import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ChartsComponent } from './components/charts/charts.component';
import { ChatComponent } from './components/chat/chat.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ChartsComponent,
    ChatComponent // لأنهم standalone
  ],
  exports: [
    ChartsComponent,
    ChatComponent
  ]
})
export class AwesomeChartsModule {}
