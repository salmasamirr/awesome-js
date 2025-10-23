import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ChatComponent } from './components/chat/chat.component';
import { ChartsComponent } from '../public-api';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ChartsComponent,
    ChatComponent 
  ],
  exports: [
    ChartsComponent,
    ChatComponent
  ]
})
export class AwesomeChartsModule {}
