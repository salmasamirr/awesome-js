import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ChatComponent } from './components/chat/chat.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    ChatComponent 
  ],
  exports: [
    ChatComponent
  ]
})
export class AwesomeChartsModule {}
