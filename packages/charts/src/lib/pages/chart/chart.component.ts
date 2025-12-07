import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatComponent } from '../../components/chat/chat.component';
import { MapChartService } from '../../services/map-chart.service';

interface ChartRenderStrategy {
  processChartOptions(options: any, echarts: any): Promise<any>;
  initializeChart?(echarts: any): Promise<void>;
}

class MapChartRenderStrategy implements ChartRenderStrategy {
  constructor(private mapChartService: MapChartService) { }

  async initializeChart(echarts: any): Promise<void> {
    await this.mapChartService.registerMapWithECharts(echarts).toPromise();
  }

  async processChartOptions(options: any, echarts: any): Promise<any> {
    return this.mapChartService.processMapChartOptions(options);
  }
}

class DefaultChartRenderStrategy implements ChartRenderStrategy {
  async processChartOptions(options: any, echarts: any): Promise<any> {
    return options;
  }
}

class ChartRenderStrategyFactory {
  constructor(private mapChartService: MapChartService) { }

  async createStrategy(chartType: string, echarts?: any): Promise<ChartRenderStrategy> {
    switch (chartType.toLowerCase()) {
      case 'map':
        const mapStrategy = new MapChartRenderStrategy(this.mapChartService);
        if (echarts && mapStrategy.initializeChart) {
          await mapStrategy.initializeChart(echarts);
        }
        return mapStrategy;
      default:
        return new DefaultChartRenderStrategy();
    }
  }
}

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

  private strategyFactory: ChartRenderStrategyFactory;
  private currentChartType: string = 'bar';

  constructor(private mapChartService: MapChartService) {
    this.strategyFactory = new ChartRenderStrategyFactory(this.mapChartService);
  }

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
          await this.strategyFactory.createStrategy(this.currentChartType, this.echarts);

          await this.waitForDOMReady();
          this.chartInstance = this.echarts.init(this.chartContainer.nativeElement);
          this.chartInstance.setOption({
            backgroundColor: 'transparent',
            animation: true
          }, true);
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

  async updateChart(options: any) {
    if (!this.chartInstance || !options) return;

    try {
      this.currentChartType = this.detectChartType(options);
      
      const strategy = await this.strategyFactory.createStrategy(this.currentChartType, this.echarts);
      const processedOptions = await strategy.processChartOptions(options, this.echarts);

      this.chartInstance.setOption(processedOptions, true, true);
      this.chartInstance.resize();
    } catch (error) {
      console.error('❌ Error updating chart:', error);
    }
  }

  private detectChartType(options: any): string {
    if (options?.series && Array.isArray(options.series) && options.series.length > 0) {
      return options.series[0].type || 'bar';
    }
    return 'bar';
  }

  async onChartGenerated(options: any) {
    if (!this.chartInstance) {
      await this.initializeChart();
    }
    this.updateChart(options);
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