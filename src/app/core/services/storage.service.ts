import { Injectable } from '@angular/core';
import { FlashcardProgress, KanaLifetimeStats, ListeningStats } from '../models/learning.models';

const FLASHCARD_PROGRESS_KEY = 'cursedJapanese.flashcardProgress';
const KANA_STATS_KEY = 'cursedJapanese.kanaStats';
const LISTENING_STATS_KEY = 'cursedJapanese.listeningStats';

@Injectable({ providedIn: 'root' })
export class StorageService {
  loadFlashcardProgress(): Record<string, FlashcardProgress> {
    return this.load<Record<string, FlashcardProgress>>(FLASHCARD_PROGRESS_KEY) ?? {};
  }

  saveFlashcardProgress(progress: Record<string, FlashcardProgress>): void {
    this.save(FLASHCARD_PROGRESS_KEY, progress);
  }

  loadKanaStats(): KanaLifetimeStats {
    return (
      this.load<KanaLifetimeStats>(KANA_STATS_KEY) ?? {
        correct: 0,
        incorrect: 0,
        weakSymbols: {}
      }
    );
  }

  saveKanaStats(stats: KanaLifetimeStats): void {
    this.save(KANA_STATS_KEY, stats);
  }

  loadListeningStats(): ListeningStats {
    return (
      this.load<ListeningStats>(LISTENING_STATS_KEY) ?? {
        attempted: 0,
        correct: 0,
        mcqAttempted: 0,
        mcqCorrect: 0,
        typingAttempted: 0,
        typingCorrect: 0,
        lastPracticedAt: null
      }
    );
  }

  saveListeningStats(stats: ListeningStats): void {
    this.save(LISTENING_STATS_KEY, stats);
  }

  clearAllProgress(): void {
    localStorage.removeItem(FLASHCARD_PROGRESS_KEY);
    localStorage.removeItem(KANA_STATS_KEY);
    localStorage.removeItem(LISTENING_STATS_KEY);
  }

  private save<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  private load<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}

