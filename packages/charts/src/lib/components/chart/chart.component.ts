import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatComponent } from '../chat/chat.component';

@Component({
  selector: 'awesome-chart',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatComponent],
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.css']
})
export class ChartComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;

  chartInstance: any;
  echarts: any = null;
  isLoading = false;
  isChatClosed = false;

  constructor() { }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initializeChart();
    }, 0);
  }

  async initializeChart() {
    if (this.chartContainer?.nativeElement && !this.chartInstance) {
      try {
        await this.loadECharts();
        if (this.echarts) {
          await this.waitForDOMReady();
          this.chartInstance = this.echarts.init(this.chartContainer.nativeElement);
          const defaultOptions = {
            backgroundColor: 'transparent',
            animation: true
          };

          this.chartInstance.setOption(defaultOptions, true);
        }
      } catch (error) {
        console.error('Error initializing chart:', error);
      }
    }
  }

  private async waitForDOMReady(): Promise<void> {
    return new Promise((resolve) => {
      const checkDimensions = () => {
        const element = this.chartContainer?.nativeElement;
        if (element && element.clientWidth > 0 && element.clientHeight > 0) {
          resolve();
        } else {
          setTimeout(checkDimensions, 50);
        }
      };
      checkDimensions();
    });
  }

  private async loadECharts(): Promise<void> {
    if (this.echarts) return;

    this.isLoading = true;
    try {
      const echartsModule = await import('echarts');
      this.echarts = echartsModule;
    } catch (error) {
      console.error('Error loading ECharts:', error);
    } finally {
      this.isLoading = false;
    }
  }

  updateChart(options: any) {
    if (!this.chartInstance || !options) return;

    try {
      setTimeout(() => {
        this.chartInstance.setOption(options, true, true);

        setTimeout(() => {
          if (this.chartInstance) {
            this.chartInstance.resize();
          }
        }, 50);
      }, 0);
    } catch (error) {
      console.error('Error updating chart:', error);
      this.showSimpleError();
    }
  }

  async onChartGenerated(options: any) {
    if (!this.chartInstance) {
      await this.initializeChart();
    }
    this.updateChart(options);
  }

  private showSimpleError() {
    console.warn('Chart failed - ensure LLM sends valid ECharts options');
  }

  ngOnDestroy() {
    if (this.chartInstance) {
      this.chartInstance.dispose();
    }
  }

  onChatToggled(isClosed: boolean) {
    this.isChatClosed = isClosed;
    setTimeout(() => {
      if (this.chartInstance) {
        this.chartInstance.resize();
      }
    }, 300);
  }
}