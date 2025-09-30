import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ChatResponse } from '../../lib/chart-component/chart-component';

@Injectable({
  providedIn: 'root'
})
export class DataService {


  private chartDataSubject = new BehaviorSubject<ChatResponse | null>(null);
  chartData$ = this.chartDataSubject.asObservable();

  private chatHistorySubject = new BehaviorSubject<string[]>([]);
  chatHistory$ = this.chatHistorySubject.asObservable();


  updateChartData(data: ChatResponse) {
    this.chartDataSubject.next(data);
  }

 
  addChatMessage(msg: string) {
    const current = this.chatHistorySubject.value;
    this.chatHistorySubject.next([...current, msg]);
  }


  resetChatHistory() {
    this.chatHistorySubject.next([]);
  }
}
