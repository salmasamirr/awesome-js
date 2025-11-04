import { Component, Output, EventEmitter, Input, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LLMService } from '../../services/llmservice';
import { SchemaManagerService } from '../../services/schema-manager.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'awesome-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy {
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

  private subscriptions = new Subscription();

  constructor(
    private llm: LLMService,
    private schemaManager: SchemaManagerService
  ) { }

  async ngOnInit() {
    await this.loadChartTypes();
    await this.loadVariations(); 
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  async loadChartTypes() {
    try {
      const types = await this.schemaManager.getAvailableChartTypes();
      this.chartTypes = types.map(type => ({
        value: type,
        label: this.formatLabel(type)
      }));

      if (this.chartTypes.length > 0 && !this.chartTypes.find(t => t.value === this.selectedChartType)) {
        this.selectedChartType = this.chartTypes[0].value;
      }
    } catch (error) {
      console.error('Error loading chart types:', error);
    }
  }

  async loadVariations() {
    try {
      const variations = await this.schemaManager.getAvailableVariations(this.selectedChartType);
      this.variations = variations.map(variation => ({
        value: variation,
        label: this.formatLabel(variation)
      }));

      if (this.selectedVariation && !this.variations.find(v => v.value === this.selectedVariation)) {
        this.selectedVariation = '';
      }
    } catch (error) {
      console.error(`Error loading variations for chart type '${this.selectedChartType}':`, error);
      this.variations = []; 
    }
  }

  private formatLabel(text: string): string {
    if (!text) return '';

    return text
      .replace(/([A-Z])/g, ' $1')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\s+/g, ' ')
      .trim();
  }

  send() {
    const msg = this.message.trim();
    if (!msg) return;

    this.messages.push({ sender: 'user', text: msg });
    this.loading = true;

    const chartSub = this.llm.generateChartOptions(msg, this.selectedChartType, this.selectedVariation)
      .subscribe({
        next: (options) => {
          this.chartGenerated.emit(options);
          this.messages.push({
            sender: 'ai',
            text: 'Chart generated successfully! 🎨'
          });
          this.loading = false;
        },
        error: (err) => {
          console.error('Error generating chart:', err);
          this.messages.push({
            sender: 'ai',
            text: 'Sorry, I encountered an error while generating the chart. Please try again. 😢'
          });
          this.loading = false;
        }
      });

    this.subscriptions.add(chartSub);
    this.message = '';
  }

  toggleChat() {
    this.isChatClosed = !this.isChatClosed;
    this.chatToggled.emit(this.isChatClosed);
  }

  async onChartTypeChange() {
    this.selectedVariation = '';
    await this.loadVariations();
  }

  addAIMessage(text: string) {
    this.messages.push({ sender: 'ai', text });
  }

  addUserMessage(text: string) {
    this.messages.push({ sender: 'user', text });
  }

  clearChat() {
    this.messages = [];
    this.message = '';
  }

  canSend(): boolean {
    return this.message.trim().length > 0 && !this.loading;
  }
}