import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import * as echarts from 'echarts/core';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { CanvasRenderer } from 'echarts/renderers';
import { ChatComponent } from '../chat/chat.component';
import { DataService } from '../../common/services/data.service';

echarts.use([CanvasRenderer]);

interface ChatResponse {
  chartType: 'bar' | 'pie' | 'line' | 'scatter' | 'area';
  title: string;
  categories?: string[];
  values: number[] | { name: string; value: number }[] | number[][];
  yAxisName?: string;
  seriesName?: string;
  xAxisName?: string;
  radius?: string;
}

interface ChartStrategy {
  getOptions(data: ChatResponse): EChartsOption;
}

// ----- Strategy classes -----
class BarChartStrategy implements ChartStrategy {
  getOptions(data: ChatResponse): EChartsOption {
    return { title: { text: data.title }, xAxis: { type: 'category', data: data.categories }, yAxis: { type: 'value', name: data.yAxisName || '' }, series: [{ data: data.values, type: 'bar' }] };
  }
}

class PieChartStrategy implements ChartStrategy {
  getOptions(data: ChatResponse): EChartsOption {
    return { title: { text: data.title, left: 'center' }, tooltip: { trigger: 'item' }, legend: { bottom: '0%', left: 'center' }, series: [{ type: 'pie', radius: data.radius || '50%', data: data.values, name: data.seriesName || '' }] };
  }
}

class LineChartStrategy implements ChartStrategy {
  getOptions(data: ChatResponse): EChartsOption {
    return { title: { text: data.title }, xAxis: { data: data.categories }, yAxis: { name: data.yAxisName || '' }, legend: { data: [data.seriesName || 'Series'] }, series: [{ name: data.seriesName || 'Series', type: 'line', smooth: true, data: data.values }] };
  }
}

class ScatterChartStrategy implements ChartStrategy {
  getOptions(data: ChatResponse): EChartsOption {
    return {
      title: { text: data.title },
      xAxis: { type: 'value', name: data.xAxisName || 'X Axis', nameLocation: 'middle', nameGap: 30 },
      yAxis: { type: 'value', name: data.yAxisName || 'Y Axis', nameLocation: 'middle', nameGap: 30 },
      tooltip: { trigger: 'item', formatter: (params: any) => `X: ${params.value[0]}<br/>Y: ${params.value[1]}` },
      series: [{ type: 'scatter', data: data.values as number[][], symbolSize: (d: number[]) => Math.sqrt(d[2]) * 2 || 10 }]
    };
  }
}

class AreaChartStrategy implements ChartStrategy {
  getOptions(data: ChatResponse): EChartsOption {
    return { title: { text: data.title }, xAxis: { type: 'category', data: data.categories, boundaryGap: false }, yAxis: { type: 'value', name: data.yAxisName || '' }, tooltip: { trigger: 'axis', axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } } }, series: [{ type: 'line', stack: 'Total', areaStyle: {}, emphasis: { focus: 'series' }, name: data.seriesName || 'Series', data: data.values as number[] }] };
  }
}

const chartStrategies: Record<string, ChartStrategy> = { bar: new BarChartStrategy(), pie: new PieChartStrategy(), line: new LineChartStrategy(), scatter: new ScatterChartStrategy(), area: new AreaChartStrategy() };

const chartImporters: Record<string, () => Promise<any>> = {
  bar: async () => (await import('echarts/charts')).BarChart,
  pie: async () => (await import('echarts/charts')).PieChart,
  line: async () => (await import('echarts/charts')).LineChart,
  scatter: async () => (await import('echarts/charts')).ScatterChart,
  area: async () => (await import('echarts/charts')).LineChart,
};

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [NgxEchartsDirective, ChatComponent],
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.css'],
  providers: [provideEchartsCore({ echarts })],
})
export class ChartComponent implements OnChanges {
  @Input() chatResponse!: ChatResponse;
  chartOptions: EChartsOption = {};

  ngOnChanges(changes: SimpleChanges) {
    if (changes['chatResponse'] && this.chatResponse) {
      this.updateChartFromData(this.chatResponse.chartType, this.chatResponse);
    }
  }

  constructor(private dataService: DataService) { }

ngOnInit() {
  this.dataService.chartData$.subscribe((data: ChatResponse | null) => {
    if (data) {
      this.updateChartFromData(data.chartType, data);
    }
  });
}


  selectedPeriod: 'Month' | 'Week' | 'Year' = 'Month';

changePeriod(period: 'Month' | 'Week' | 'Year') {
  this.selectedPeriod = period;


  if (this.chatResponse) {
    const updatedData = this.filterDataByPeriod(this.chatResponse, period);
    this.updateChartFromData(updatedData.chartType, updatedData);
  }
}


filterDataByPeriod(data: ChatResponse, period: string): ChatResponse {

  const factor = period === 'Month' ? 1 : period === 'Week' ? 0.25 : 12;
  const newValues = (data.values as number[]).map(v => v * factor);
  return { ...data, values: newValues };
}


  async updateChartFromData(chartType: string, data: ChatResponse) {
    const { GridComponent, LegendComponent, TooltipComponent, TitleComponent } = await import('echarts/components');
    const importer = chartImporters[chartType];
    if (!importer) {
      this.chartOptions = { title: { text: 'Unsupported Chart Type' } };
      return;
    }
    const ChartComponentClass = await importer();
    echarts.use([ChartComponentClass, GridComponent, LegendComponent, TooltipComponent, TitleComponent]);
    const strategy = chartStrategies[chartType];
    this.chartOptions = strategy.getOptions(data);
  }

  handleChatMessage(msg: string) {
    try {
      const data: ChatResponse = JSON.parse(msg);
      this.updateChartFromData(data.chartType, data);
    } catch (e) {
      console.error('Invalid message format:', msg);
    }
  }
}
