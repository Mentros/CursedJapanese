import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { STARTER_DECK } from '../../core/data/starter-deck.data';
import { StorageService } from '../../core/services/storage.service';
import { SrsService } from '../../core/services/srs.service';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [DatePipe, CardModule, ButtonModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  templateUrl: './progress.component.html'
})
export class ProgressComponent {
  constructor(
    private storage: StorageService,
    private srs: SrsService,
    private confirmationService: ConfirmationService
  ) {}

  reviewedCount(): number {
    return Object.keys(this.storage.loadFlashcardProgress()).length;
  }

  dueNowCount(): number {
    const progress = this.storage.loadFlashcardProgress();
    return this.srs.getDueCards(STARTER_DECK, progress).length;
  }

  kanaAccuracy(): number {
    const stats = this.storage.loadKanaStats();
    const total = stats.correct + stats.incorrect;
    if (!total) {
      return 0;
    }
    return Math.round((stats.correct / total) * 100);
  }

  listeningAttempted(): number {
    return this.storage.loadListeningStats().attempted;
  }

  listeningAccuracy(): number {
    const stats = this.storage.loadListeningStats();
    if (!stats.attempted) {
      return 0;
    }
    return Math.round((stats.correct / stats.attempted) * 100);
  }

  lastReviewAt(): string | null {
    const all = Object.values(this.storage.loadFlashcardProgress())
      .map((entry) => entry.lastReviewedAt)
      .filter((value): value is string => !!value)
      .sort()
      .reverse();
    return all[0] ?? null;
  }

  resetAllProgress(event: Event): void {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'This will clear all kana, flashcard, and listening progress. Continue?',
      header: 'Reset progress',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Reset',
      rejectLabel: 'Cancel',
      accept: () => this.storage.clearAllProgress()
    });
  }
}

