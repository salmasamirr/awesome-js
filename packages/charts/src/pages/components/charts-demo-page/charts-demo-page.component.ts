import { Component } from '@angular/core';
import { ChartComponent } from '../../../lib/components/chart-component';
import { ChatComponent } from '../../../lib/components/chat-component';
import { DataService } from '../../../common/services/data.service';

@Component({
  selector: 'app-charts-demo-page',
  standalone: true,
  imports: [ChartComponent, ChatComponent],
  templateUrl: './charts-demo-page.component.html',
  styleUrls: ['./charts-demo-page.component.css'],
})
export class ChartsDemoPageComponent {
  constructor(public dataService: DataService) {}
}
