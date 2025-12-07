import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MapChartService {
  private mapDataCache: any = null;
  private isMapRegistered = false;

  constructor(private http: HttpClient) { }

  registerMapWithECharts(echarts: any): Observable<void> {
    if (this.isMapRegistered) {
      return new Observable(observer => {
        observer.next();
        observer.complete();
      });
    }

    if (this.mapDataCache) {
      echarts.registerMap('world', this.mapDataCache);
      this.isMapRegistered = true;
      return new Observable(observer => {
        observer.next();
        observer.complete();
      });
    }

    return this.http.get('/assets/map/world.json').pipe(
      map((geoData: any) => {
        if (geoData?.type === 'FeatureCollection' && geoData.features) {
          this.mapDataCache = geoData;
          echarts.registerMap('world', geoData);
          this.isMapRegistered = true;
        } else {
          throw new Error('Invalid map data format');
        }
        return void 0;
      }),
      catchError(() => throwError(() => new Error('Map data loading failed')))
    );  
  }

  processMapChartOptions(options: any): any {
    if (!options?.series) return options;

    return {
      ...options,
      series: options.series.map((series: any) => 
        series.type === 'map' ? {
          ...series,
          map: series.map || 'world',
          roam: series.roam ?? true,
          emphasis: {
            itemStyle: { areaColor: '#389BB7' },
            ...series.emphasis
          }
        } : series
      )
    };
  }

}