import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  NgZone,
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
    <section class="renderer" [class.renderer--live]="hasFrame()">

      <!-- Title bar -->
      <header class="renderer__bar">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
          <path d="M8 22h8M12 18v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span class="renderer__title">Live Preview</span>

        <div class="renderer__badge" [class.renderer__badge--live]="hasFrame()">
          <span class="renderer__dot"></span>
          {{ hasFrame() ? 'LIVE' : 'STANDBY' }}
        </div>
      </header>

      <!-- Screen -->
      <div class="renderer__screen">

        <!-- Decorative grid (sits behind everything via paint order) -->
        <div class="renderer__grid" aria-hidden="true"></div>

        <!-- Waiting placeholder — absolutely covers the screen, fades out on first frame -->
        <div class="renderer__placeholder" [class.renderer__placeholder--hidden]="hasFrame()">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" opacity="0.4">
            <rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.2"/>
            <path d="M8 22h8M12 18v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            <circle cx="12" cy="11" r="3" stroke="currentColor" stroke-width="1.2"/>
          </svg>
          <span class="renderer__placeholder-text">Awaiting signal&hellip;</span>
        </div>

        <!-- Canvas — in normal flow below the absolute placeholder, fades in on first frame -->
        <canvas #gameCanvas class="renderer__canvas" [class.renderer__canvas--visible]="hasFrame()"></canvas>

      </div>
    </section>
  `,
  styles: [`
    /* Outer shell */
    .renderer {
      border: 1px solid rgba(79, 110, 247, 0.35);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: border-color 0.5s ease, box-shadow 0.5s ease;
    }
    .renderer--live {
      border-color: rgba(52, 211, 153, 0.55);
      box-shadow: 0 0 0 1px rgba(52, 211, 153, 0.08), 0 0 28px rgba(52, 211, 153, 0.08);
    }

    /* Title bar */
    .renderer__bar {
      align-items: center;
      background: var(--bg-elevated);
      border-bottom: 1px solid var(--border);
      color: var(--text-secondary);
      display: flex;
      gap: 7px;
      padding: 7px 12px;
    }
    .renderer__title {
      color: var(--text-secondary);
      flex: 1;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .renderer__badge {
      align-items: center;
      background: rgba(139, 146, 168, 0.1);
      border-radius: 999px;
      color: var(--text-muted);
      display: flex;
      font-family: var(--font-mono);
      font-size: 0.65rem;
      font-weight: 700;
      gap: 5px;
      letter-spacing: 0.1em;
      padding: 3px 9px;
      transition: background 0.4s, color 0.4s;
    }
    .renderer__badge--live {
      background: rgba(52, 211, 153, 0.12);
      color: var(--success);
    }
    .renderer__dot {
      background: currentColor;
      border-radius: 50%;
      display: block;
      height: 6px;
      width: 6px;
    }
    .renderer__badge--live .renderer__dot {
      animation: dot-pulse 1.8s ease-in-out infinite;
    }
    @keyframes dot-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.25; }
    }

    /* Screen — contains grid, placeholder (absolute), canvas (flow) */
    .renderer__screen {
      background: #000;
      min-height: 180px;
      position: relative;
    }

    /* Decorative grid — absolute, painted first, behind placeholder */
    .renderer__grid {
      background-image:
        linear-gradient(rgba(79, 110, 247, 0.045) 1px, transparent 1px),
        linear-gradient(90deg, rgba(79, 110, 247, 0.045) 1px, transparent 1px);
      background-size: 22px 22px;
      bottom: 0;
      left: 0;
      pointer-events: none;
      position: absolute;
      right: 0;
      top: 0;
    }

    /* Placeholder — absolute so it overlays the canvas, fades out */
    .renderer__placeholder {
      align-items: center;
      bottom: 0;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      gap: 12px;
      justify-content: center;
      left: 0;
      min-height: 180px;
      position: absolute;
      right: 0;
      top: 0;
      transition: opacity 0.4s;
      z-index: 1;
    }
    .renderer__placeholder--hidden {
      opacity: 0;
      pointer-events: none;
    }
    .renderer__placeholder-text {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    /* Canvas — in normal flow, starts invisible, fades in */
    .renderer__canvas {
      display: block;
      height: auto;
      opacity: 0;
      transition: opacity 0.4s;
      width: 100%;
    }
    .renderer__canvas--visible {
      opacity: 1;
    }
  `],
})
export class GameRendererComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private sessionService = inject(SessionService);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  hasFrame = signal(false);

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.sub = this.sessionService.frames$.subscribe((b64) => {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        if (!this.hasFrame()) {
          // Belt-and-suspenders: ngZone.run ensures the signal update
          // triggers Angular's scheduler; detectChanges() forces an
          // immediate synchronous view refresh on top of that.
          this.ngZone.run(() => {
            this.hasFrame.set(true);
            this.cdr.detectChanges();
          });
        }
      };
      img.onerror = () => console.error('[GameRenderer] Failed to decode frame');
      img.src = b64;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
