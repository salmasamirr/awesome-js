import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChartsComponent } from '@awesome/awesome-chart';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ChartsComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']   
})
export class App  {
  
}
