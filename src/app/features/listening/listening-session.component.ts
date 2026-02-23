import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { LISTENING_DECK } from '../../core/data/listening-deck.data';
import { ListeningItem, ListeningStats } from '../../core/models/learning.models';
import { StorageService } from '../../core/services/storage.service';

type ExerciseType = 'mcq' | 'typing';

@Component({
  selector: 'app-listening-session',
  standalone: true,
  imports: [FormsModule, CardModule, ButtonModule, InputTextModule, TagModule],
  templateUrl: './listening-session.component.html'
})
export class ListeningSessionComponent implements OnDestroy {
  deck = LISTENING_DECK;
  currentItem: ListeningItem | null = null;
  exerciseType: ExerciseType = 'mcq';
  sessionReviewed = 0;
  sessionCorrect = 0;
  selectedOption = '';
  typedAnswer = '';
  answerChecked = false;
  answerCorrect: boolean | null = null;
  feedback = '';
  revealAnswer = false;
  audioError = '';
  stats: ListeningStats;
  private queue: ListeningItem[] = [];
  private audioElement: HTMLAudioElement | null = null;

  constructor(private storage: StorageService) {
    this.stats = this.storage.loadListeningStats();
    this.startSession();
  }

  ngOnDestroy(): void {
    this.stopAudio();
  }

  startSession(): void {
    this.queue = this.shuffleItems([...this.deck]);
    this.loadNext();
    this.sessionReviewed = 0;
    this.sessionCorrect = 0;
  }

  playAudio(): void {
    if (!this.currentItem) {
      return;
    }

    this.stopAudio();
    this.audioError = '';
    this.audioElement = new Audio(this.currentItem.audioSrc);
    this.audioElement.play().catch(() => {
      this.audioError = 'Audio clip unavailable. Using built-in speech fallback.';
      this.playSpeechFallback(this.currentItem?.japanese ?? '');
    });
  }

  submitTypingAnswer(): void {
    if (!this.currentItem || this.answerChecked || this.exerciseType !== 'typing') {
      return;
    }
    const normalized = this.normalizeAnswer(this.typedAnswer);
    if (!normalized) {
      this.feedback = 'Type what you hear first.';
      return;
    }

    const accepted = this.acceptedTypingAnswers(this.currentItem);
    const isCorrect = accepted.includes(normalized);
    this.finishQuestion(isCorrect, this.currentItem.japanese);
  }

  selectOption(option: string): void {
    if (!this.currentItem || this.answerChecked || this.exerciseType !== 'mcq') {
      return;
    }
    const isCorrect = option === this.currentItem.meaning;
    this.selectedOption = option;
    this.finishQuestion(isCorrect, this.currentItem.meaning);
  }

  nextQuestion(): void {
    this.loadNext();
  }

  sessionAccuracy(): number {
    if (!this.sessionReviewed) {
      return 0;
    }
    return Math.round((this.sessionCorrect / this.sessionReviewed) * 100);
  }

  lifetimeAccuracy(): number {
    if (!this.stats.attempted) {
      return 0;
    }
    return Math.round((this.stats.correct / this.stats.attempted) * 100);
  }

  private finishQuestion(isCorrect: boolean, expected: string): void {
    this.answerChecked = true;
    this.answerCorrect = isCorrect;
    this.revealAnswer = true;
    this.feedback = isCorrect ? 'Correct.' : `Not quite. Expected: ${expected}`;
    this.sessionReviewed += 1;
    if (isCorrect) {
      this.sessionCorrect += 1;
    }
    this.updateStats(isCorrect);
  }

  private updateStats(isCorrect: boolean): void {
    this.stats.attempted += 1;
    this.stats.lastPracticedAt = new Date().toISOString();
    if (isCorrect) {
      this.stats.correct += 1;
    }
    if (this.exerciseType === 'mcq') {
      this.stats.mcqAttempted += 1;
      if (isCorrect) {
        this.stats.mcqCorrect += 1;
      }
    } else {
      this.stats.typingAttempted += 1;
      if (isCorrect) {
        this.stats.typingCorrect += 1;
      }
    }
    this.storage.saveListeningStats(this.stats);
  }

  private loadNext(): void {
    this.currentItem = this.queue.shift() ?? null;
    this.exerciseType = Math.random() < 0.5 ? 'mcq' : 'typing';
    this.answerChecked = false;
    this.answerCorrect = null;
    this.feedback = '';
    this.revealAnswer = false;
    this.audioError = '';
    this.selectedOption = '';
    this.typedAnswer = '';
    this.stopAudio();
  }

  private stopAudio(): void {
    if (!this.audioElement) {
      return;
    }
    this.audioElement.pause();
    this.audioElement.currentTime = 0;
    this.audioElement = null;
  }

  private playSpeechFallback(text: string): void {
    if (!text || !('speechSynthesis' in window)) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    window.speechSynthesis.speak(utterance);
  }

  private acceptedTypingAnswers(item: ListeningItem): string[] {
    const accepted = new Set<string>();
    accepted.add(this.normalizeAnswer(item.japanese));
    for (const alt of item.acceptedJapanese ?? []) {
      const normalized = this.normalizeAnswer(alt);
      if (normalized) {
        accepted.add(normalized);
      }
    }
    return [...accepted];
  }

  private normalizeAnswer(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[.!?'"`]/g, '');
  }

  private shuffleItems(items: ListeningItem[]): ListeningItem[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j] as ListeningItem, shuffled[i] as ListeningItem];
    }
    return shuffled;
  }
}
