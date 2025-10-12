import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'awesome-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toggle.component.html',
  styleUrls: ['./toggle.component.css']
})
export class ToggleComponent {
  @Input() options: string[] = [];
  @Input() selected: string = '';
  @Output() selectedChange = new EventEmitter<string>();

  select(option: string) {
    this.selected = option;
    this.selectedChange.emit(option);
  }
}
