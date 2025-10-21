import { Component, Output, EventEmitter, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface ChartRequest {
  message: string;
  chartType: string;
  variation?: string;
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
  selectedVariation = '';

  chartTypes = [
    { value: 'bar', label: 'Bar Chart' },
    { value: 'line', label: 'Line Chart' },
    { value: 'pie', label: 'Pie Chart' },
    { value: 'scatter', label: 'Scatter Chart' },
    { value: 'radar', label: 'Radar Chart' },
    { value: 'gauge', label: 'Gauge Chart'},
    { value: 'area', label: 'Area Chart' },
    { value: 'treemap', label: 'Treemap Chart' },
    { value: 'sunburst', label: 'Sunburst Chart' },
    { value: 'sankey', label: 'Sankey Chart' },
    { value: 'heatmap', label: 'Heatmap Chart' },
    { value: 'funnel', label: 'Funnel Chart' },
    { value: 'candlestick', label: 'Candlestick Chart' },
    { value: 'boxplot', label: 'Boxplot Chart' },
    { value: 'graph', label: 'Graph Chart' },
    { value: 'map', label: 'Map Chart' },
    { value: 'parallel', label: 'Parallel Chart' }
  ];

  variations: { [key: string]: { value: string; label: string }[] } = {
    'bar': [
      { value: '', label: 'Basic' },
      { value: 'horizontal', label: 'Horizontal' },
      { value: 'stacked', label: 'Stacked' },
      { value: 'negative', label: 'Negative' },
      { value: 'racing', label: 'Racing' },
      { value: 'waterfall', label: 'Waterfall' }
    ],
    'line': [
      { value: '', label: 'Basic' },
      { value: 'line-smooth', label: 'Smooth' },
      { value: 'line-area', label: 'Area' },
      { value: 'line-stacked', label: 'Stacked' },
      { value: 'line-step', label: 'Step' }
    ],
    'pie': [
      { value: '', label: 'Basic' },
      { value: 'doughnut(Ring)-pie', label: 'Doughnut' },
      { value: 'rose-pie', label: 'Rose' },
      { value: 'nested-pie', label: 'Nested' }
    ],
    'scatter': [
      { value: '', label: 'Basic' },
      { value: 'bubble-scatter', label: 'Bubble' },
      { value: 'effect-scatter', label: 'Effect' },
      { value: 'large-scatter', label: 'Large' }
    ],
    'radar': [
      { value: '', label: 'Basic' },
      { value: 'filled-radar', label: 'Filled' },
      { value: 'multiple-radar', label: 'Multiple' }
    ],
    'gauge': [
      { value: '', label: 'Basic' },
      { value: 'dashboard', label: 'Dashboard' },
      { value: 'multi', label: 'Multi' }
    ],
    'area': [
      { value: '', label: 'Basic' },
      { value: 'smooth', label: 'Smooth' },
      { value: 'stacked', label: 'Stacked' },
      { value: 'step', label: 'Step' }
    ],
    'treemap': [
      { value: '', label: 'Basic' },
      { value: 'treemap-drilldown', label: 'Drilldown' },
      { value: 'treemap-with-levels', label: 'With Levels' }
    ],
    'sunburst': [
      { value: '', label: 'Basic' },
      { value: 'sunburst-with-levels', label: 'With Levels' },
      { value: 'sunburst-with-radius', label: 'With Radius' }
    ],
    'sankey': [
      { value: '', label: 'Basic' },
      { value: 'sankey-node-alignments', label: 'Node Alignments' }
    ],
    'heatmap': [
      { value: '', label: 'Basic' },
      { value: 'calendar-heatmap', label: 'Calendar' },
      { value: 'geo-heatmap', label: 'Geo' }
    ],
    'funnel': [
      { value: '', label: 'Basic' },
      { value: 'comparison', label: 'Comparison' },
      { value: 'sorted', label: 'Sorted' }
    ],
    'candlestick': [
      { value: '', label: 'Basic' },
      { value: 'candlestick-with-ma', label: 'With MA' },
      { value: 'candlestick-with-volume', label: 'With Volume' }
    ],
    'boxplot': [
      { value: '', label: 'Basic' },
      { value: 'multiple', label: 'Multiple' }
    ],
    'graph': [
      { value: '', label: 'Basic' },
      { value: 'circular-graph', label: 'Circular' },
      { value: 'force-graph', label: 'Force' },
      { value: 'graph-with-categories', label: 'With Categories' }
    ],
    'map': [
      { value: '', label: 'Basic' },
      { value: 'china-map', label: 'China Map' }
    ],
    'parallel': [
      { value: '', label: 'Basic' },
      { value: 'parallel-with-multiple-lines', label: 'Multiple Lines' }
    ]
  };

  send() {
    const msg = this.message.trim();
    if (msg) {
      this.messageSent.emit({
        message: msg,
        chartType: this.selectedChartType,
        variation: this.selectedVariation || undefined
      });
      this.message = '';
    }
  }

  onChartTypeChange() {
    // Reset variation when chart type changes
    this.selectedVariation = '';
  }

  getCurrentVariations() {
    return this.variations[this.selectedChartType] || [];
  }
}
