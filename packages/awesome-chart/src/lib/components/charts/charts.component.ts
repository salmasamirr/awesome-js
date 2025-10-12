import { Component, ElementRef, ViewChild, Input, AfterViewInit } from '@angular/core';
import * as echarts from 'echarts';
import { LLMService } from '../../services/llmservice';
import { ChatComponent, ChartRequest } from '../chat/chat.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'awesome-charts',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatComponent],
  templateUrl: './charts.component.html',
  styleUrls: ['./charts.component.css']
})
export class ChartsComponent implements AfterViewInit {
  @Input() options: any;
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;

  chartInstance: any;
  loading = false;
  error = '';
  messages: { sender: 'user' | 'ai'; text: string }[] = [];

  chartOptions: any;
  

  constructor(private llm: LLMService) {}

  ngAfterViewInit() {
    this.chartInstance = echarts.init(this.chartContainer.nativeElement);
    if (this.options) {
      this.chartOptions = this.options;
      this.chartInstance.setOption(this.chartOptions);
    }
  }

  handleUserMessage(request: ChartRequest) {
    this.messages.push({ sender: 'user', text: request.message });
    this.loading = true;

    this.llm.generateChartOptions(request.message, request.chartType).subscribe({
      next: (options) => {
        // Chart options generated successfully
        this.chartOptions = options;
        this.chartInstance.setOption(this.chartOptions);
        this.messages.push({ sender: 'ai', text: 'Chart generated successfully 🎨' });
        this.loading = false;
      },
      error: (err) => {
        console.error('Error generating chart:', err);
        this.messages.push({ sender: 'ai', text: 'Error occurred while generating chart 😢' });
        this.loading = false;
      }
    });
  }

}
