export type KanaScript = 'hiragana' | 'katakana';

export interface KanaSymbol {
  kana: string;
  romaji: string;
  script: KanaScript;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint?: string;
  jlptLevel: JlptLevel;
}

export type JlptLevel = 'N5' | 'N4' | 'N3';

export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';

export interface FlashcardProgress {
  intervalDays: number;
  dueAt: string;
  lastReviewedAt: string | null;
  repetitions: number;
}

export interface ListeningItem {
  id: string;
  japanese: string;
  meaning: string;
  audioSrc: string;
  options: string[];
  acceptedJapanese?: string[];
}

export interface ListeningStats {
  attempted: number;
  correct: number;
  mcqAttempted: number;
  mcqCorrect: number;
  typingAttempted: number;
  typingCorrect: number;
  lastPracticedAt: string | null;
}

export interface KanaLifetimeStats {
  correct: number;
  incorrect: number;
  weakSymbols: Record<string, number>;
}

