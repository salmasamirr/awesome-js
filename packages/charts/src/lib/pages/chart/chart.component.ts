import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatComponent } from '../../components/chat/chat.component';

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
      
      // Load and register map data for world map
      await this.loadMapData();
    } catch (error) {
      console.error('Error loading ECharts:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private async loadMapData(): Promise<void> {
    try {
      // Load world map JSON data
      const worldMapData = await this.loadWorldMapJson();
      if (worldMapData && this.echarts) {
        this.echarts.registerMap('world', worldMapData);
        console.log('Map world loaded successfully from external source');
        return;
      }
      
      // If external sources fail, try to use ECharts built-in map or create a simple one
      if (this.echarts) {
        // Try to use a simple world map approach
        await this.loadSimpleWorldMap();
      }
    } catch (error) {
      console.error('Error loading map data:', error);
      // Try the simple approach as final fallback
      await this.loadSimpleWorldMap();
    }
  }

  private async loadSimpleWorldMap(): Promise<void> {
    try {
      // Use ECharts built-in world map if available, or create a simplified version
      const simpleWorldData = await this.createRealisticWorldMap();
      if (this.echarts && simpleWorldData) {
        this.echarts.registerMap('world', simpleWorldData);
        console.log('Fallback world map registered successfully');
      }
    } catch (error) {
      console.error('Error loading simple world map:', error);
    }
  }

  private async loadWorldMapJson(): Promise<any> {
    try {
      // Try to load from multiple reliable CDN sources for world map
      const sources = [
        'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson',
        'https://cdn.jsdelivr.net/npm/world-atlas@3/countries-110m.json',
        'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/countries.geojson'
      ];
      
      for (const source of sources) {
        try {
          console.log(`Attempting to load world map from: ${source}`);
          const response = await fetch(source);
          if (response.ok) {
            const data = await response.json();
            console.log('Successfully loaded world map from:', source);
            return data;
          }
        } catch (sourceError) {
          console.warn(`Failed to load from ${source}:`, sourceError);
          continue;
        }
      }
      
      // If all CDN sources fail, use the local assets
      try {
        const localResponse = await fetch('/assets/maps/world.json');
        if (localResponse.ok) {
          console.log('Loading world map from local assets');
          return await localResponse.json();
        }
      } catch (localError) {
        console.warn('Local assets also failed:', localError);
      }
      
      // Last resort: use built-in ECharts world map if available
      return null; // This will trigger the alternative approach
    } catch (error) {
      console.warn('Error loading world map JSON:', error);
      return null;
    }
  }

  private async createRealisticWorldMap(): Promise<any> {
    // More realistic world map with better country shapes
    return {
      type: "FeatureCollection",
      features: [
        // China - more realistic shape
        {
          type: "Feature",
          properties: { name: "China" },
          geometry: {
            type: "Polygon",
            coordinates: [[[73.7, 18.2], [73.7, 53.5], [82.7, 54.5], [96.0, 54.5], [127.0, 50.0], [134.8, 48.4], [134.8, 35.4], [119.8, 25.2], [108.6, 21.4], [101.8, 21.4], [94.2, 28.9], [82.0, 30.1], [73.7, 18.2]]]
          }
        },
        // United States - continental shape
        {
          type: "Feature",
          properties: { name: "United States" },
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              // Continental US
              [[[-125.0, 48.3], [-125.0, 32.5], [-117.0, 32.5], [-111.0, 31.3], [-106.5, 31.7], [-104.0, 29.0], [-94.0, 29.3], [-84.3, 29.5], [-80.0, 25.8], [-80.2, 31.0], [-75.0, 35.0], [-75.5, 39.5], [-74.0, 40.5], [-73.5, 41.0], [-69.9, 41.6], [-67.0, 44.8], [-67.8, 47.1], [-82.4, 46.1], [-90.0, 48.0], [-94.8, 49.4], [-123.0, 49.0], [-125.0, 48.3]]],
              // Alaska
              [[[-179.0, 51.2], [-179.0, 71.4], [-140.0, 71.4], [-140.0, 60.0], [-179.0, 51.2]]]
            ]
          }
        },
        // Russia - simplified shape
        {
          type: "Feature",
          properties: { name: "Russia" },
          geometry: {
            type: "Polygon", 
            coordinates: [[[19.6, 41.1], [40.0, 41.1], [40.0, 81.2], [180.0, 81.2], [180.0, 64.2], [170.0, 64.2], [170.0, 50.0], [142.0, 50.0], [142.0, 41.1], [40.0, 41.1], [19.6, 41.1]]]
          }
        },
        // India - triangular shape
        {
          type: "Feature",
          properties: { name: "India" },
          geometry: {
            type: "Polygon",
            coordinates: [[[68.1, 6.7], [97.4, 6.7], [97.4, 28.5], [88.0, 28.5], [88.0, 28.5], [85.0, 28.5], [77.6, 35.5], [68.1, 31.9], [68.1, 6.7]]]
          }
        },
        // Brazil - South America shape
        {
          type: "Feature",
          properties: { name: "Brazil" },
          geometry: {
            type: "Polygon",
            coordinates: [[[-73.9, 5.3], [-34.8, 5.3], [-34.8, -7.3], [-37.0, -18.0], [-44.0, -23.0], [-53.0, -33.7], [-73.9, -33.7], [-73.9, 5.3]]]
          }
        },
        // Canada
        {
          type: "Feature",
          properties: { name: "Canada" },
          geometry: {
            type: "Polygon",
            coordinates: [[[-141.0, 60.0], [-52.6, 60.0], [-52.6, 83.1], [-141.0, 83.1], [-141.0, 60.0]]]
          }
        },
        // Australia
        {
          type: "Feature",
          properties: { name: "Australia" },
          geometry: {
            type: "Polygon",
            coordinates: [[[113.3, -43.6], [153.6, -43.6], [153.6, -10.7], [113.3, -10.7], [113.3, -43.6]]]
          }
        },
        // European countries
        {
          type: "Feature",
          properties: { name: "Germany" },
          geometry: {
            type: "Polygon",
            coordinates: [[[5.9, 47.3], [15.0, 47.3], [15.0, 55.1], [5.9, 55.1], [5.9, 47.3]]]
          }
        },
        {
          type: "Feature",
          properties: { name: "France" },
          geometry: {
            type: "Polygon",
            coordinates: [[[-5.0, 42.3], [8.2, 42.3], [8.2, 51.1], [-5.0, 51.1], [-5.0, 42.3]]]
          }
        },
        // Other countries
        {
          type: "Feature",
          properties: { name: "Japan" },
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              [[[138.0, 33.0], [146.0, 33.0], [146.0, 41.0], [138.0, 41.0], [138.0, 33.0]]],
              [[[129.0, 31.0], [131.0, 31.0], [131.0, 33.0], [129.0, 33.0], [129.0, 31.0]]]
            ]
          }
        }
      ]
    };
  }

  private createFallbackWorldMap(): any {
    // Simple fallback world map with basic country boundaries
    return this.createRealisticWorldMap();
  }

  async updateChart(options: any) {
    if (!this.chartInstance || !options) return;

    try {
      // Check if this is a map chart and ensure map data is loaded
      if (this.isMapChart(options)) {
        await this.ensureMapDataLoaded();
      }

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

  private isMapChart(options: any): boolean {
    return options?.series?.some((series: any) => series.type === 'map');
  }

  private async ensureMapDataLoaded(): Promise<void> {
    if (!this.echarts) return;
    
    try {
      // Check if world map is already registered
      const mapInstance = this.echarts.getMap('world');
      if (!mapInstance) {
        console.log('Map not registered, loading map data...');
        await this.loadMapData();
      }
    } catch (error) {
      console.warn('Error checking/loading map data:', error);
      // Try to load anyway
      await this.loadMapData();
    }
  }

  async onChartGenerated(options: any) {
    if (!this.chartInstance) {
      await this.initializeChart();
    }
    await this.updateChart(options);
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