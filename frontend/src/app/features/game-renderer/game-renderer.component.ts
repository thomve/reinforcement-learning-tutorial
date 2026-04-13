import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-game-renderer',
  standalone: true,
  template: `
    <div class="renderer-card card">
      <div class="card__header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="4" width="20" height="16" rx="2" stroke="var(--accent)" stroke-width="1.5"/>
          <path d="M8 15l4-6 4 6" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h3>Live Preview</h3>
      </div>
      <div class="canvas-container">
        <canvas #gameCanvas></canvas>
        @if (!hasFrame) {
          <div class="placeholder">
            <span class="text-muted">Waiting for first frame...</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .renderer-card { }

    .canvas-container {
      background: #000;
      border-radius: var(--radius-sm);
      min-height: 200px;
      overflow: hidden;
      position: relative;
      width: 100%;
    }

    canvas {
      display: block;
      width: 100%;
      height: auto;
    }

    .placeholder {
      align-items: center;
      display: flex;
      height: 200px;
      justify-content: center;
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
    }
  `],
})
export class GameRendererComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private sessionService = inject(SessionService);
  private sub?: Subscription;

  hasFrame = false;

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;

    this.sub = this.sessionService.frames$.subscribe((b64) => {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        this.hasFrame = true;
      };
      img.src = b64;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
