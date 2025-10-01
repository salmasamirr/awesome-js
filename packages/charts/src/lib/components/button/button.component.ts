import { Component, Input } from '@angular/core';

@Component({
  selector: 'button',
  standalone: true,
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.css']
})
export class ButtonComponent {
  @Input() label = 'Button';
  @Input() type: 'primary' | 'secondary' = 'primary';
  @Input() disabled = false;
}
