import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CardModule, ButtonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  navItems = [
    { label: 'Kana', route: '/kana', icon: 'pi pi-pencil' },
    { label: 'Draw Kana', route: '/kana-draw', icon: 'pi pi-pencil' },
    { label: 'Flashcards', route: '/flashcards', icon: 'pi pi-book' },
    { label: 'Listening', route: '/listening', icon: 'pi pi-volume-up' },
    { label: 'Progress', route: '/progress', icon: 'pi pi-chart-line' }
  ];
}
