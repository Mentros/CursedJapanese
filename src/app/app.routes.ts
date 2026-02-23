import { Routes } from '@angular/router';
import { KanaPracticeComponent } from './features/kana/kana-practice.component';
import { KanaDrawingComponent } from './features/kana-drawing/kana-drawing.component';
import { FlashcardSessionComponent } from './features/flashcards/flashcard-session.component';
import { ProgressComponent } from './features/progress/progress.component';
import { ListeningSessionComponent } from './features/listening/listening-session.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'kana' },
  { path: 'kana', component: KanaPracticeComponent },
  { path: 'kana-draw', component: KanaDrawingComponent },
  { path: 'flashcards', component: FlashcardSessionComponent },
  { path: 'listening', component: ListeningSessionComponent },
  { path: 'progress', component: ProgressComponent },
  { path: '**', redirectTo: 'kana' }
];
