import { Component } from '@angular/core';
import { DataService } from '../../services/data.service';


interface ChatResponse {
  chartType: string;
  title: string;
  values: any;
}


@Component({
  selector: 'chat',
  standalone: true,
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent {
  isOpen = false;
  message: string = '';
  chatHistory: string[] = [];

  

  constructor(private dataService: DataService) {

    this.dataService.chatHistory$.subscribe((history: string[]) => {
      this.chatHistory = history;
    });
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  sendMessage(msg: string): void {
    if (!msg.trim()) return;


    this.dataService.addChatMessage(msg);

  
    try {
      const chatResponse: ChatResponse = JSON.parse(msg);
      this.dataService.updateChartData(chatResponse);
    } catch (e) {
      console.error('Invalid message format:', msg);
    }

    this.message = '';
  }
}
