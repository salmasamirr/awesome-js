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
  templateUrl:'./chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent {
  @Output() messageSent = new EventEmitter<ChartRequest>();
  @Input() loading = false;
  message = '';
  selectedChartType = 'bar';
  selectedVariation = '';

  chartTypes = [
    { value: 'bar', label: 'Bar Chart', folder: 'bar' },
    { value: 'line', label: 'Line Chart', folder: 'line' },
    { value: 'pie', label: 'Pie Chart', folder: 'pie' },
    { value: 'scatter', label: 'Scatter Chart', folder: 'scatter' },
    { value: 'radar', label: 'Radar Chart', folder: 'radar' },
    { value: 'gauge', label: 'Gauge Chart', folder: 'gauge' },
    { value: 'area', label: 'Area Chart', folder: 'area' },
    { value: 'treemap', label: 'Treemap Chart', folder: 'treemap' },
    { value: 'sunburst', label: 'Sunburst Chart', folder: 'sunburst' },
    { value: 'sankey', label: 'Sankey Chart', folder: 'sankey' },
    { value: 'heatmap', label: 'Heatmap Chart', folder: 'heatmap' },
    { value: 'funnel', label: 'Funnel Chart', folder: 'funnel' },
    { value: 'candlestick', label: 'Candlestick Chart', folder: 'candlestick' },
    { value: 'boxplot', label: 'Boxplot Chart', folder: 'boxplot' },
    { value: 'graph', label: 'Graph Chart', folder: 'graph' },
    { value: 'map', label: 'Map Chart', folder: 'map' },
    { value: 'parallel', label: 'Parallel Chart', folder: 'parallel' }
  ];

  variations: { [key: string]: { value: string; label: string; folder: string }[] } = {
    'bar': [
      { value: '', label: 'Basic', folder: 'bar' },
      { value: 'horizontal', label: 'Horizontal', folder: 'bar/horizontal' },
      { value: 'stacked', label: 'Stacked', folder: 'bar/stacked' },
      { value: 'negative', label: 'Negative', folder: 'bar/negative' },
      { value: 'racing', label: 'Racing', folder: 'bar/racing' },
      { value: 'waterfall', label: 'Waterfall', folder: 'bar/waterfall' }
    ],
    'line': [
      { value: '', label: 'Basic', folder: 'line' },
      { value: 'line-smooth', label: 'Smooth', folder: 'line/line-smooth' },
      { value: 'line-area', label: 'Area', folder: 'line/line-area' },
      { value: 'line-stacked', label: 'Stacked', folder: 'line/line-stacked' },
      { value: 'line-step', label: 'Step', folder: 'line/line-step' }
    ],
    'pie': [
      { value: '', label: 'Basic', folder: 'pie' },
      { value: 'doughnut(Ring)-pie', label: 'Doughnut', folder: 'pie/doughnut(Ring)-pie' },
      { value: 'rose-pie', label: 'Rose', folder: 'pie/rose-pie' },
      { value: 'nested-pie', label: 'Nested', folder: 'pie/nested-pie' }
    ],
    'scatter': [
      { value: '', label: 'Basic', folder: 'scatter' },
      { value: 'bubble-scatter', label: 'Bubble', folder: 'scatter/bubble-scatter' },
      { value: 'effect-scatter', label: 'Effect', folder: 'scatter/effect-scatter' },
      { value: 'large-scatter', label: 'Large', folder: 'scatter/large-scatter' }
    ],
    'radar': [
      { value: '', label: 'Basic', folder: 'radar' },
      { value: 'filled-radar', label: 'Filled', folder: 'radar/filled-radar' },
      { value: 'multiple-radar', label: 'Multiple', folder: 'radar/multiple-radar' }
    ],
    'gauge': [
      { value: '', label: 'Basic', folder: 'gauge' },
      { value: 'dashboard', label: 'Dashboard', folder: 'gauge/dashboard' },
      { value: 'multi', label: 'Multi', folder: 'gauge/multi' }
    ],
    'area': [
      { value: '', label: 'Basic', folder: 'area' },
      { value: 'smooth', label: 'Smooth', folder: 'area/smooth' },
      { value: 'stacked', label: 'Stacked', folder: 'area/stacked' },
      { value: 'step', label: 'Step', folder: 'area/step' }
    ],
    'treemap': [
      { value: '', label: 'Basic', folder: 'treemap' },
      { value: 'treemap-drilldown', label: 'Drilldown', folder: 'treemap/treemap-drilldown' },
      { value: 'treemap-with-levels', label: 'With Levels', folder: 'treemap/treemap-with-levels' }
    ],
    'sunburst': [
      { value: '', label: 'Basic', folder: 'sunburst' },
      { value: 'sunburst-with-levels', label: 'With Levels', folder: 'sunburst/sunburst-with-levels' },
      { value: 'sunburst-with-radius', label: 'With Radius', folder: 'sunburst/sunburst-with-radius' }
    ],
    'sankey': [
      { value: '', label: 'Basic', folder: 'sankey' },
      { value: 'sankey-node-alignments', label: 'Node Alignments', folder: 'sankey/sankey-node-alignments' }
    ],
    'heatmap': [
      { value: '', label: 'Basic', folder: 'heatmap' },
      { value: 'calendar-heatmap', label: 'Calendar', folder: 'heatmap/calendar-heatmap' },
      { value: 'geo-heatmap', label: 'Geo', folder: 'heatmap/geo-heatmap' }
    ],
    'funnel': [
      { value: '', label: 'Basic', folder: 'funnel' },
      { value: 'comparison', label: 'Comparison', folder: 'funnel/comparison' },
      { value: 'sorted', label: 'Sorted', folder: 'funnel/sorted' }
    ],
    'candlestick': [
      { value: '', label: 'Basic', folder: 'candlestick' },
      { value: 'candlestick-with-ma', label: 'With MA', folder: 'candlestick/candlestick-with-ma' },
      { value: 'candlestick-with-volume', label: 'With Volume', folder: 'candlestick/candlestick-with-volume' }
    ],
    'boxplot': [
      { value: '', label: 'Basic', folder: 'boxplot' },
      { value: 'multiple', label: 'Multiple', folder: 'boxplot/multiple' }
    ],
    'graph': [
      { value: '', label: 'Basic', folder: 'graph' },
      { value: 'circular-graph', label: 'Circular', folder: 'graph/circular-graph' },
      { value: 'force-graph', label: 'Force', folder: 'graph/force-graph' },
      { value: 'graph-with-categories', label: 'With Categories', folder: 'graph/graph-with-categories' }
    ],
    'map': [
      { value: '', label: 'Basic', folder: 'map' },
      { value: 'china-map', label: 'China Map', folder: 'map/china-map' }
    ],
    'parallel': [
      { value: '', label: 'Basic', folder: 'parallel' },
      { value: 'parallel-with-multiple-lines', label: 'Multiple Lines', folder: 'parallel/parallel-with-multiple-lines' }
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
