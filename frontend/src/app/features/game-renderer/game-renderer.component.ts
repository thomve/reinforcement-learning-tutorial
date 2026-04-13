import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  signal,
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
        <!-- Placeholder shown until first frame arrives -->
        <div class="placeholder" [class.placeholder--hidden]="hasFrame()">
          <span class="text-muted">Waiting for first frame...</span>
        </div>
        <canvas #gameCanvas [class.canvas--visible]="hasFrame()"></canvas>
      </div>
    </div>
  `,
  styles: [`
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
      height: auto;
      opacity: 0;
      transition: opacity 0.3s;
      width: 100%;
    }

    .canvas--visible {
      opacity: 1;
    }

    .placeholder {
      align-items: center;
      display: flex;
      height: 200px;
      justify-content: center;
      left: 0;
      position: absolute;
      right: 0;
      top: 0;
      transition: opacity 0.3s;
    }

    .placeholder--hidden {
      opacity: 0;
      pointer-events: none;
    }
  `],
})
export class GameRendererComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private sessionService = inject(SessionService);
  private cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  hasFrame = signal(false);

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;

    this.sub = this.sessionService.frames$.subscribe((b64) => {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        if (!this.hasFrame()) {
          this.hasFrame.set(true);
          // img.onload runs outside Angular's zone — trigger detection manually
          this.cdr.detectChanges();
        }
      };
      img.src = b64;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
