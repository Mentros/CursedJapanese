import { NgClass } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { KANA_SYMBOLS } from '../../core/data/kana.data';
import { KanaLifetimeStats, KanaScript, KanaSymbol } from '../../core/models/learning.models';
import { StorageService } from '../../core/services/storage.service';

type KanaMode = KanaScript | 'mixed';

interface SessionMistake {
  kana: string;
  romaji: string;
  userAnswer: string;
}

@Component({
  selector: 'app-kana-practice',
  standalone: true,
  imports: [NgClass, FormsModule, CardModule, ButtonModule, InputTextModule, SelectButtonModule],
  templateUrl: './kana-practice.component.html'
})
export class KanaPracticeComponent {
  modeOptions = [
    { label: 'Hiragana', value: 'hiragana' },
    { label: 'Katakana', value: 'katakana' },
    { label: 'Mixed', value: 'mixed' }
  ];

  mode: KanaMode = 'hiragana';
  sessionSize = 10;
  currentPrompt: KanaSymbol = this.pickPrompt();
  answer = '';
  feedback = '';
  checkedCurrent = false;
  sessionFinished = false;
  lastAnswerCorrect: boolean | null = null;
  asked = 0;
  correct = 0;
  incorrect = 0;
  sessionMistakes: SessionMistake[] = [];
  lifetimeStats: KanaLifetimeStats;

  constructor(private storage: StorageService) {
    this.lifetimeStats = this.storage.loadKanaStats();
  }

  checkAnswer(): void {
    if (this.checkedCurrent || this.sessionFinished) {
      return;
    }
    this.sanitizeSessionSize();

    const normalized = this.answer.trim().toLowerCase();
    const isCorrect = normalized === this.currentPrompt.romaji;
    this.asked += 1;

    if (isCorrect) {
      this.correct += 1;
      this.lifetimeStats.correct += 1;
      this.lastAnswerCorrect = true;
      this.feedback = `Correct: ${this.currentPrompt.kana} = ${this.currentPrompt.romaji}`;
    } else {
      this.incorrect += 1;
      this.lifetimeStats.incorrect += 1;
      this.lastAnswerCorrect = false;
      this.sessionMistakes.push({
        kana: this.currentPrompt.kana,
        romaji: this.currentPrompt.romaji,
        userAnswer: normalized || '(empty)'
      });
      this.lifetimeStats.weakSymbols[this.currentPrompt.kana] =
        (this.lifetimeStats.weakSymbols[this.currentPrompt.kana] ?? 0) + 1;
      this.feedback = `Not quite. Correct answer is ${this.currentPrompt.romaji}.`;
    }

    this.storage.saveKanaStats(this.lifetimeStats);
    this.checkedCurrent = true;
    if (this.asked >= this.sessionSize) {
      this.sessionFinished = true;
      this.feedback = `Session finished. ${this.correct}/${this.asked} correct.`;
    }
  }

  nextQuestion(): void {
    if (this.sessionFinished) {
      return;
    }
    this.answer = '';
    this.feedback = '';
    this.checkedCurrent = false;
    this.lastAnswerCorrect = null;
    this.currentPrompt = this.pickPrompt();
  }

  onModeChange(): void {
    this.startSession();
  }

  onEnter(event: Event): void {
    event.preventDefault();
    if (this.checkedCurrent) {
      this.nextQuestion();
      return;
    }
    this.checkAnswer();
  }

  startSession(): void {
    this.sanitizeSessionSize();
    this.asked = 0;
    this.correct = 0;
    this.incorrect = 0;
    this.answer = '';
    this.feedback = '';
    this.checkedCurrent = false;
    this.sessionFinished = false;
    this.lastAnswerCorrect = null;
    this.sessionMistakes = [];
    this.currentPrompt = this.pickPrompt();
  }

  private sanitizeSessionSize(): void {
    this.sessionSize = Math.max(1, Math.floor(this.sessionSize || 1));
  }

  @HostListener('document:keydown.enter', ['$event'])
  onDocumentEnter(event: Event): void {
    this.onEnter(event);
  }

  weakestPreview(): string {
    const topWeak = Object.entries(this.lifetimeStats.weakSymbols)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([symbol, misses]) => `${symbol} (${misses})`);

    return topWeak.length ? topWeak.join(', ') : 'No weak symbols yet';
  }

  private pickPrompt(): KanaSymbol {
    const filtered = KANA_SYMBOLS.filter((symbol) =>
      this.mode === 'mixed' ? true : symbol.script === this.mode
    );
    return filtered[Math.floor(Math.random() * filtered.length)];
  }
}

