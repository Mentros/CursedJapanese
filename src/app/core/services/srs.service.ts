import { Injectable } from '@angular/core';
import { Flashcard, FlashcardProgress, ReviewGrade } from '../models/learning.models';

@Injectable({ providedIn: 'root' })
export class SrsService {
  getDueCards(deck: Flashcard[], progressMap: Record<string, FlashcardProgress>): Flashcard[] {
    const now = Date.now();
    return deck.filter((card) => {
      const progress = progressMap[card.id];
      return !progress || new Date(progress.dueAt).getTime() <= now;
    });
  }

  gradeCard(existing: FlashcardProgress | undefined, grade: ReviewGrade): FlashcardProgress {
    const now = new Date();
    const previousInterval = existing?.intervalDays ?? 0;
    const previousRepetitions = existing?.repetitions ?? 0;
    const nextInterval = this.nextInterval(previousInterval, grade);

    return {
      intervalDays: nextInterval,
      repetitions: grade === 'again' ? 0 : previousRepetitions + 1,
      dueAt: this.addDays(now, nextInterval).toISOString(),
      lastReviewedAt: now.toISOString()
    };
  }

  private nextInterval(previous: number, grade: ReviewGrade): number {
    if (grade === 'again') {
      return 1;
    }

    if (previous <= 1) {
      if (grade === 'hard') {
        return 2;
      }
      if (grade === 'good') {
        return 3;
      }
      return 5;
    }

    const multiplierByGrade: Record<Exclude<ReviewGrade, 'again'>, number> = {
      hard: 1.2,
      good: 1.8,
      easy: 2.5
    };

    return Math.max(1, Math.round(previous * multiplierByGrade[grade]));
  }

  private addDays(source: Date, days: number): Date {
    const next = new Date(source);
    next.setDate(next.getDate() + days);
    return next;
  }
}

