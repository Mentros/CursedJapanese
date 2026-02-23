import { Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { STARTER_DECK } from '../../core/data/starter-deck.data';
import { KANJI_EXPLANATIONS, KanjiExplanation } from '../../core/data/kanji-explanations.data';
import {
  Flashcard,
  FlashcardProgress,
  JlptLevel,
  ReviewGrade
} from '../../core/models/learning.models';
import { StorageService } from '../../core/services/storage.service';
import { SrsService } from '../../core/services/srs.service';

@Component({
  selector: 'app-flashcard-session',
  standalone: true,
  imports: [DatePipe, FormsModule, CardModule, ButtonModule, TagModule, InputTextModule],
  templateUrl: './flashcard-session.component.html'
})
export class FlashcardSessionComponent {
  readonly deck = signal(STARTER_DECK);
  readonly jlptLevels: JlptLevel[] = ['N5', 'N4', 'N3'];
  readonly selectedJlptLevel = signal<JlptLevel>('N5');
  readonly kanjiExplanations = KANJI_EXPLANATIONS;
  readonly progressMap = signal<Record<string, FlashcardProgress>>({});
  readonly currentCard = signal<Flashcard | null>(null);
  readonly sessionMode = signal<'due' | 'free'>('due');
  readonly revealed = signal(false);
  readonly reviewedThisSession = signal(0);
  readonly writtenAnswer = signal('');
  readonly answerChecked = signal(false);
  readonly answerCorrect = signal<boolean | null>(null);
  readonly answerFeedback = signal('');
  private readonly reviewQueue = signal<Flashcard[]>([]);
  readonly filteredDeck = computed(() =>
    this.deck().filter((card) => card.jlptLevel === this.selectedJlptLevel())
  );
  readonly dueCards = computed(() => this.srs.getDueCards(this.filteredDeck(), this.progressMap()));
  readonly countLearnedCards = computed(() => Object.keys(this.progressMap()).length);
  readonly nextDueAt = computed<string | null>(() => {
    const selectedCardIds = new Set(this.filteredDeck().map((card) => card.id));
    const dueTimes = Object.entries(this.progressMap())
      .filter(([cardId]) => selectedCardIds.has(cardId))
      .map(([, entry]) => entry)
      .map((entry) => new Date(entry.dueAt).getTime())
      .filter((value) => !Number.isNaN(value))
      .sort((a, b) => a - b);

    if (!dueTimes.length) {
      return null;
    }

    return new Date(dueTimes[0]).toISOString();
  });
  readonly cardProgress = computed<FlashcardProgress | null>(() => {
    const current = this.currentCard();
    if (!current) {
      return null;
    }
    return this.progressMap()[current.id] ?? null;
  });
  readonly currentCardKanjiBreakdown = computed<Array<{ kanji: string; explanation: KanjiExplanation | null }>>(
    () => {
      const current = this.currentCard();
      if (!current) {
        return [];
      }

      const uniqueKanji = [...new Set([...current.front].filter((char) => this.isKanji(char)))];
      return uniqueKanji.map((kanji) => ({
        kanji,
        explanation: this.kanjiExplanations[kanji] ?? null
      }));
    }
  );

  constructor(
    private storage: StorageService,
    private srs: SrsService
  ) {
    this.progressMap.set(this.storage.loadFlashcardProgress());
    this.currentCard.set(this.dueCards()[0] ?? null);
  }

  reveal(): void {
    this.revealed.set(true);
  }

  checkWrittenAnswer(): void {
    const current = this.currentCard();
    if (!current || this.answerChecked()) {
      return;
    }

    const userAnswer = this.normalizeAnswer(this.writtenAnswer());
    if (!userAnswer) {
      this.answerFeedback.set('Write an answer first.');
      return;
    }

    const acceptedAnswers = this.acceptedAnswersFor(current.back);
    const isCorrect = acceptedAnswers.includes(userAnswer);
    this.answerChecked.set(true);
    this.answerCorrect.set(isCorrect);
    this.revealed.set(true);
    this.answerFeedback.set(
      isCorrect ? 'Correct.' : `Not quite. Expected one of: ${acceptedAnswers.join(' / ')}.`
    );
  }

  grade(grade: ReviewGrade): void {
    const current = this.currentCard();
    if (!current) {
      return;
    }

    const progressMap = this.progressMap();
    const existing = progressMap[current.id];
    const updatedProgressMap: Record<string, FlashcardProgress> = {
      ...progressMap,
      [current.id]: this.srs.gradeCard(existing, grade)
    };
    this.progressMap.set(updatedProgressMap);
    this.storage.saveFlashcardProgress(updatedProgressMap);
    this.reviewedThisSession.update((value) => value + 1);
    this.loadNextCard();
  }

  startFreeSession(): void {
    this.sessionMode.set('free');
    const queue = this.shuffleCards([...this.filteredDeck()]);
    this.reviewQueue.set(queue);
    this.currentCard.set(queue.shift() ?? null);
    this.reviewQueue.set(queue);
    this.resetCardUiState();
  }

  selectJlptLevel(level: JlptLevel): void {
    if (this.selectedJlptLevel() === level) {
      return;
    }

    this.selectedJlptLevel.set(level);
    this.sessionMode.set('due');
    this.reviewQueue.set([]);
    this.currentCard.set(this.dueCards()[0] ?? null);
    this.resetCardUiState();
  }

  private loadNextCard(): void {
    if (this.sessionMode() === 'free') {
      const queue = [...this.reviewQueue()];
      this.currentCard.set(queue.shift() ?? null);
      this.reviewQueue.set(queue);
      if (!this.currentCard()) {
        this.sessionMode.set('due');
        this.currentCard.set(this.dueCards()[0] ?? null);
      }
    } else {
      this.currentCard.set(this.dueCards()[0] ?? null);
    }
    this.resetCardUiState();
  }

  private resetCardUiState(): void {
    this.revealed.set(false);
    this.writtenAnswer.set('');
    this.answerChecked.set(false);
    this.answerCorrect.set(null);
    this.answerFeedback.set('');
  }

  private acceptedAnswersFor(back: string): string[] {
    const normalizedBack = back.toLowerCase();
    const answers = new Set<string>();
    answers.add(this.normalizeAnswer(normalizedBack));

    const parenthetical = normalizedBack.match(/\(([^)]+)\)/g) ?? [];
    for (const group of parenthetical) {
      const cleaned = this.normalizeAnswer(group.replace(/[()]/g, ''));
      if (cleaned) {
        answers.add(cleaned);
      }
    }

    const withoutParen = normalizedBack.replace(/\([^)]*\)/g, ' ');
    const splitParts = withoutParen.split(/[\/,;]|(?:\s+or\s+)/g);
    for (const rawPart of splitParts) {
      const cleaned = this.normalizeAnswer(rawPart);
      if (cleaned) {
        answers.add(cleaned);
      }
    }

    return [...answers].filter((value) => value.length > 0);
  }

  private normalizeAnswer(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[.!?'"`]/g, '')
      .replace(/\s+/g, ' ');
  }

  private isKanji(char: string): boolean {
    return /[\u4E00-\u9FFF]/.test(char);
  }

  private shuffleCards(cards: Flashcard[]): Flashcard[] {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j] as Flashcard, shuffled[i] as Flashcard];
    }
    return shuffled;
  }
}

