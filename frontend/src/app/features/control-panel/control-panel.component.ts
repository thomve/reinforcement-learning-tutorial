import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionStatus } from '../../core/models/types';

@Component({
  selector: 'app-control-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card control-panel">
      @switch (status) {
        @case ('created') {
          <button class="btn btn--primary w-full" (click)="start.emit()">
            ▶ Start Training
          </button>
        }
        @case ('training') {
          <div class="flex gap-8">
            <button class="btn btn--ghost w-full" (click)="pause.emit()">⏸ Pause</button>
            <button class="btn btn--danger w-full" (click)="stop.emit()">⏹ Stop</button>
          </div>
        }
        @case ('paused') {
          <div class="flex gap-8">
            <button class="btn btn--primary w-full" (click)="resume.emit()">▶ Resume</button>
            <button class="btn btn--danger w-full" (click)="stop.emit()">⏹ Stop</button>
          </div>
        }
        @case ('complete') {
          <div class="complete-msg">
            <span class="text-success">Training complete!</span>
            <button class="btn btn--ghost btn--sm" (click)="reset.emit()">New Session</button>
          </div>
        }
        @case ('error') {
          <div class="complete-msg">
            <span class="text-danger">Training failed</span>
            <button class="btn btn--ghost btn--sm" (click)="reset.emit()">Reset</button>
          </div>
        }
        @case ('stopped') {
          <div class="complete-msg">
            <span class="text-secondary">Stopped</span>
            <button class="btn btn--ghost btn--sm" (click)="reset.emit()">New Session</button>
          </div>
        }
        @default {
          <button class="btn btn--primary w-full" (click)="start.emit()">
            ▶ Start Training
          </button>
        }
      }
    </div>
  `,
  styles: [`
    .control-panel { padding: 12px; }
    .complete-msg {
      align-items: center;
      display: flex;
      gap: 12px;
      justify-content: space-between;
    }
  `],
})
export class ControlPanelComponent {
  @Input() status: SessionStatus = 'created';
  @Output() start = new EventEmitter<void>();
  @Output() pause = new EventEmitter<void>();
  @Output() resume = new EventEmitter<void>();
  @Output() stop = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
}
