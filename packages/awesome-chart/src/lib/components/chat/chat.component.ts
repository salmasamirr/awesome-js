import { Component, Output, EventEmitter, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface ChartRequest {
  message: string;
  chartType: string;
}

@Component({
  selector: 'awesome-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent {
  @Output() messageSent = new EventEmitter<ChartRequest>();
  @Input() loading = false;
  message = '';
  selectedChartType = 'bar';

  chartTypes = [
    { value: 'bar', label: 'Bar Chart' },
    { value: 'line', label: 'Line Chart' },
    { value: 'pie', label: 'Pie Chart' },
    { value: 'scatter', label: 'Scatter Chart' },
    { value: 'radar', label: 'Radar Chart' },
    { value: 'gauge', label: 'Gauge Chart' },
    { value: 'area', label: 'Area Chart' }
  ];

  send() {
    const msg = this.message.trim();
    if (msg) {
      this.messageSent.emit({
        message: msg,
        chartType: this.selectedChartType
      });
      this.message = '';
    }
  }
}
