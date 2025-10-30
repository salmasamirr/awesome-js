import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatComponent } from './components/chat/chat.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ChatComponent 
  ],
  exports: [
    ChatComponent
  ]
})
export class AwesomeChartsModule {}
