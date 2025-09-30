import { Component } from '@angular/core';
import { DataService } from '../../common/services/data.service';
import { ChatResponse } from '../../common/models/chat-response.model'; // لو عاملينه

@Component({
  selector: 'app-chat',
  standalone: true,
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent {
  isOpen = false;
  message: string = '';
  chatHistory: string[] = [];

  constructor(private dataService: DataService) {
    // TypeScript يعرف إن history هو string[]
    this.dataService.chatHistory$.subscribe((history: string[]) => {
      this.chatHistory = history;
    });
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  sendMessage(msg: string): void {
    if (!msg.trim()) return;

    // أضف الرسالة للـ service
    this.dataService.addChatMessage(msg);

    // حاول تحديث chart
    try {
      const chatResponse: ChatResponse = JSON.parse(msg);
      this.dataService.updateChartData(chatResponse);
    } catch (e) {
      console.error('Invalid message format:', msg);
    }

    this.message = '';
  }
}
