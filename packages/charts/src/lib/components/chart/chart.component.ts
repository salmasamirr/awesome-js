import { Component, ElementRef, ViewChild, Input, AfterViewInit } from '@angular/core';
import * as echarts from 'echarts';
import { LLMService } from '../../services/llmservice';
import { ChatComponent, ChartRequest } from '../chat/chat.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'awesome-chart',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatComponent],
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.css']
})
export class ChartsComponent implements AfterViewInit {
  @Input() options: any;
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;

  chartInstance: any;
  loading = false;
  error = '';
  messages: { sender: 'user' | 'ai'; text: string }[] = [];
  chartOptions: any;
  showChat = true;

  constructor(private llm: LLMService) {}

  ngAfterViewInit() {
    this.chartInstance = echarts.init(this.chartContainer.nativeElement);
    if (this.options) {
      this.chartOptions = this.ensurePrimaryColor(this.options);
      this.chartInstance.setOption(this.chartOptions);
    }
  }

  toggleChat() {
    this.showChat = !this.showChat;
  }

  private ensurePrimaryColor(options: any) {
    if (!options) return options;
    const primary = '#0052CC';
    if (!options.color || (Array.isArray(options.color) && options.color.length === 0)) {
      options.color = [primary];
    }
    if (Array.isArray(options.series)) {
      options.series = options.series.map((s: any) => {
        if (s && !s.color) {
          return { ...s, color: primary };
        }
        return s;
      });
    }
    return options;
  }

  handleUserMessage(request: ChartRequest) {
    this.messages.push({ sender: 'user', text: request.message });
    this.loading = true;

    this.llm.generateChartOptions(request.message, request.chartType, request.variation).subscribe({
      next: (options) => {
        this.chartOptions = this.ensurePrimaryColor(options);
        this.chartInstance.setOption(this.chartOptions);
        this.messages.push({ sender: 'ai', text: 'Chart generated successfully 🎨' });
        this.loading = false;
      },
      error: (err) => {
        this.messages.push({ sender: 'ai', text: 'Error occurred while generating chart 😢' });
        this.loading = false;
      }
    });
  }
}
