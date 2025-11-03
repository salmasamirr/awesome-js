import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChartComponent } from '@awesome/awesome-chart';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ChartComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']   
})
export class App  {
  
}
