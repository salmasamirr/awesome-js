import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LLMService } from '../../services/llmservice';
import { SchemaManagerService } from '../../services/schema-manager.service';

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
export class ChatComponent implements OnInit {
  @Output() chartGenerated = new EventEmitter<any>();
  @Output() chatToggled = new EventEmitter<boolean>();
  @Input() loading = false;
  message = '';
  selectedChartType = 'bar';
  selectedVariation = '';
  messages: { sender: 'user' | 'ai'; text: string }[] = [];
  isChatClosed = false;

  chartTypes: { value: string; label: string }[] = [];
  variations: { value: string; label: string }[] = [];

  constructor(
    private llm: LLMService,
    private schemaManager: SchemaManagerService
  ) { }

  ngOnInit() {
    this.loadChartTypes();
  }

  async loadChartTypes() {
    try {
      const types = await this.schemaManager.getAvailableChartTypes();
      this.chartTypes = types.map(type => ({
        value: type,
        label: this.formatLabel(type)
      }));
    } catch (error) {
    }
  }

  async loadVariations() {
    try {
      const variations = await this.schemaManager.getAvailableVariations(this.selectedChartType);
      this.variations = variations.map(variation => ({
        value: variation,
        label: this.formatLabel(variation)
      }));
    } catch (error) { /* Error loading variations */ }
  }

  private formatLabel(text: string): string {
    return text
      .replace(/([A-Z])/g, ' $1')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  send() {
    const msg = this.message.trim();
    if (msg) {
      this.messages.push({ sender: 'user', text: msg });
      this.loading = true;

      this.llm.generateChartOptions(msg, this.selectedChartType, this.selectedVariation)
        .subscribe({
          next: (options) => {
            this.chartGenerated.emit(options);
            this.messages.push({ sender: 'ai', text: 'Chart generated successfully 🎨' });
            this.loading = false;
          },
          error: (err) => {
            this.messages.push({ sender: 'ai', text: 'Error occurred while generating chart 😢' });
            this.loading = false;
          }
        });

      this.message = '';
    }
  }

  toggleChat() {
    this.isChatClosed = !this.isChatClosed;
    this.chatToggled.emit(this.isChatClosed);
  }

  onChartTypeChange() {
    this.selectedVariation = '';
    this.loadVariations();
  }
}