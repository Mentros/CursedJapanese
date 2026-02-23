import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { KANA_SYMBOLS } from '../../core/data/kana.data';
import { KanaLifetimeStats, KanaScript, KanaSymbol } from '../../core/models/learning.models';
import { StorageService } from '../../core/services/storage.service';

type KanaMode = KanaScript | 'mixed';

@Component({
  selector: 'app-kana-drawing',
  standalone: true,
  imports: [FormsModule, CardModule, ButtonModule, SelectButtonModule],
  templateUrl: './kana-drawing.component.html'
})
export class KanaDrawingComponent implements AfterViewInit {
  @ViewChild('drawCanvas') drawCanvasRef?: ElementRef<HTMLCanvasElement>;

  modeOptions = [
    { label: 'Hiragana', value: 'hiragana' },
    { label: 'Katakana', value: 'katakana' },
    { label: 'Mixed', value: 'mixed' }
  ];

  private retryQueue: KanaSymbol[] = [];
  mode: KanaMode = 'hiragana';
  currentPrompt: KanaSymbol = this.pickPrompt();
  feedback = '';
  asked = 0;
  correct = 0;
  incorrect = 0;
  checkedCurrent = false;
  modelReady = false;
  modelError = '';
  lifetimeStats: KanaLifetimeStats;
  bestGuess = '';

  private isDrawing = false;
  private hasInk = false;
  private templateVectors: Record<string, Float32Array> = {};

  constructor(private storage: StorageService) {
    this.lifetimeStats = this.storage.loadKanaStats();
  }

  ngAfterViewInit(): void {
    this.resetCanvas();
    this.initRecognizer();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (!this.drawCanvasRef) {
      return;
    }
    this.resetCanvas();
  }

  onModeChange(): void {
    this.retryQueue = [];
    this.nextQuestion();
  }

  onEnter(event: Event | KeyboardEvent): void {
    event.preventDefault();
    if (this.checkedCurrent) {
      this.nextQuestion();
      return;
    }
    this.submitDrawing();
  }

  @HostListener('document:keydown.enter', ['$event'])
  onDocumentEnter(event: Event): void {
    this.onEnter(event);
  }

  onPointerDown(event: PointerEvent): void {
    const canvas = this.drawCanvas();
    canvas.setPointerCapture(event.pointerId);
    const point = this.toCanvasPoint(event);
    const ctx = this.context2d();
    this.isDrawing = true;
    this.hasInk = true;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isDrawing) {
      return;
    }
    const point = this.toCanvasPoint(event);
    const ctx = this.context2d();
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.isDrawing) {
      return;
    }
    const canvas = this.drawCanvas();
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    this.isDrawing = false;
  }

  clearCanvas(): void {
    this.resetCanvas();
  }

  submitDrawing(): void {
    if (this.checkedCurrent || !this.modelReady) {
      return;
    }

    if (!this.hasInk) {
      this.feedback = 'Draw a kana character first, then submit.';
      return;
    }

    const predicted = this.predictKana();
    this.bestGuess = predicted;
    this.asked += 1;
    this.checkedCurrent = true;

    const isCorrect = predicted === this.currentPrompt.kana;
    if (isCorrect) {
      this.correct += 1;
      this.lifetimeStats.correct += 1;
      this.feedback = `Correct: ${this.currentPrompt.romaji} -> ${this.currentPrompt.kana}`;
    } else {
      this.incorrect += 1;
      this.lifetimeStats.incorrect += 1;
      this.retryQueue.push(this.currentPrompt);
      this.lifetimeStats.weakSymbols[this.currentPrompt.kana] =
        (this.lifetimeStats.weakSymbols[this.currentPrompt.kana] ?? 0) + 1;
      this.feedback = `Not quite. You drew ${predicted}, expected ${this.currentPrompt.kana}.`;
    }

    this.storage.saveKanaStats(this.lifetimeStats);
  }

  nextQuestion(): void {
    this.currentPrompt = this.pickPrompt();
    this.feedback = '';
    this.bestGuess = '';
    this.checkedCurrent = false;
    this.resetCanvas();
  }

  weakestPreview(): string {
    const topWeak = Object.entries(this.lifetimeStats.weakSymbols)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([symbol, misses]) => `${symbol} (${misses})`);

    return topWeak.length ? topWeak.join(', ') : 'No weak symbols yet';
  }

  private initRecognizer(): void {
    try {
      for (const symbol of KANA_SYMBOLS) {
        this.templateVectors[symbol.kana] = this.buildTemplateVector(symbol.kana);
      }
      this.modelReady = true;
      this.modelError = '';
    } catch {
      this.modelReady = false;
      this.modelError = 'Failed to initialize local recognizer.';
    }
  }

  private buildTemplateVector(kana: string): Float32Array {
    const size = 96;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D context unavailable');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '62px "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif';
    ctx.fillText(kana, size / 2, size / 2);

    return this.normalizeToVector(ctx.getImageData(0, 0, size, size));
  }

  private predictKana(): string {
    const canvas = this.drawCanvas();
    const ctx = this.context2d();
    const vector = this.normalizeToVector(ctx.getImageData(0, 0, canvas.width, canvas.height));
    const candidates = KANA_SYMBOLS.filter((symbol) =>
      this.mode === 'mixed' ? true : symbol.script === this.mode
    );

    let bestKana = candidates[0]?.kana ?? '';
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const candidate of candidates) {
      const template = this.templateVectors[candidate.kana];
      if (!template) {
        continue;
      }
      const score = this.cosineSimilarity(vector, template);
      if (score > bestScore) {
        bestScore = score;
        bestKana = candidate.kana;
      }
    }
    return bestKana;
  }

  private normalizeToVector(imageData: ImageData): Float32Array {
    const sourceWidth = imageData.width;
    const sourceHeight = imageData.height;
    const alphaThreshold = 15;
    let minX = sourceWidth;
    let minY = sourceHeight;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < sourceHeight; y += 1) {
      for (let x = 0; x < sourceWidth; x += 1) {
        const index = (y * sourceWidth + x) * 4;
        const r = imageData.data[index] ?? 255;
        const g = imageData.data[index + 1] ?? 255;
        const b = imageData.data[index + 2] ?? 255;
        const a = imageData.data[index + 3] ?? 255;
        const brightness = (r + g + b) / 3;
        const ink = a > alphaThreshold && brightness < 245;
        if (ink) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    const targetSize = 32;
    const vector = new Float32Array(targetSize * targetSize);
    if (maxX < minX || maxY < minY) {
      return vector;
    }

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    const scale = Math.min((targetSize - 4) / cropWidth, (targetSize - 4) / cropHeight);
    const drawWidth = Math.max(1, Math.round(cropWidth * scale));
    const drawHeight = Math.max(1, Math.round(cropHeight * scale));
    const offsetX = Math.floor((targetSize - drawWidth) / 2);
    const offsetY = Math.floor((targetSize - drawHeight) / 2);

    const offscreen = document.createElement('canvas');
    offscreen.width = targetSize;
    offscreen.height = targetSize;
    const offscreenCtx = offscreen.getContext('2d');
    if (!offscreenCtx) {
      return vector;
    }

    offscreenCtx.fillStyle = '#ffffff';
    offscreenCtx.fillRect(0, 0, targetSize, targetSize);
    offscreenCtx.imageSmoothingEnabled = true;

    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = sourceWidth;
    sourceCanvas.height = sourceHeight;
    const sourceCtx = sourceCanvas.getContext('2d');
    if (!sourceCtx) {
      return vector;
    }
    sourceCtx.putImageData(imageData, 0, 0);

    offscreenCtx.drawImage(
      sourceCanvas,
      minX,
      minY,
      cropWidth,
      cropHeight,
      offsetX,
      offsetY,
      drawWidth,
      drawHeight
    );

    const normalized = offscreenCtx.getImageData(0, 0, targetSize, targetSize).data;
    for (let i = 0; i < vector.length; i += 1) {
      const index = i * 4;
      const brightness = ((normalized[index] ?? 255) + (normalized[index + 1] ?? 255) + (normalized[index + 2] ?? 255)) / 3;
      vector[i] = 1 - brightness / 255;
    }
    return vector;
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    const length = Math.min(a.length, b.length);
    for (let i = 0; i < length; i += 1) {
      const av = a[i] ?? 0;
      const bv = b[i] ?? 0;
      dot += av * bv;
      magA += av * av;
      magB += bv * bv;
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    if (!denom) {
      return 0;
    }
    return dot / denom;
  }

  private drawCanvas(): HTMLCanvasElement {
    const canvas = this.drawCanvasRef?.nativeElement;
    if (!canvas) {
      throw new Error('Canvas not initialized');
    }
    return canvas;
  }

  private context2d(): CanvasRenderingContext2D {
    const ctx = this.drawCanvas().getContext('2d');
    if (!ctx) {
      throw new Error('2D context unavailable');
    }
    return ctx;
  }

  private resetCanvas(): void {
    const canvas = this.drawCanvas();
    this.syncCanvasResolution(canvas);
    const ctx = this.context2d();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = Math.max(8, Math.round(canvas.width * 0.05));
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    this.hasInk = false;
  }

  private toCanvasPoint(event: PointerEvent): { x: number; y: number } {
    const canvas = this.drawCanvas();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  private syncCanvasResolution(canvas: HTMLCanvasElement): void {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  private pickPrompt(): KanaSymbol {
    if (this.retryQueue.length) {
      return this.retryQueue.shift() as KanaSymbol;
    }
    const filtered = KANA_SYMBOLS.filter((symbol) =>
      this.mode === 'mixed' ? true : symbol.script === this.mode
    );
    return filtered[Math.floor(Math.random() * filtered.length)];
  }
}
