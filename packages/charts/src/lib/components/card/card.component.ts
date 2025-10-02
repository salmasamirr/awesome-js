import { Component, Input } from '@angular/core';

@Component({
  selector: 'card',
  standalone: true,
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css']
})
export class CardComponent {
  @Input() title = '';
}
