import { Component, EventEmitter, inject, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../core/services/session.service';
import { EnvironmentDef } from '../../core/models/types';

@Component({
  selector: 'app-game-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <div class="card__header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="3" width="20" height="18" rx="2" stroke="var(--accent)" stroke-width="1.5"/>
          <path d="M8 12h8M12 8v8" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <h3>Environment</h3>
      </div>

      <div class="env-list">
        @for (env of envs(); track env.id) {
          <button
            class="env-item"
            [class.env-item--active]="selected() === env.id"
            (click)="select(env)"
          >
            <div class="env-item__top">
              <span class="env-item__name">{{ env.displayName }}</span>
              <span class="badge badge--{{ env.difficulty }}">{{ env.difficulty }}</span>
            </div>
            <p class="env-item__desc text-secondary">{{ env.description }}</p>
            <div class="env-item__meta text-muted">
              <span>obs: {{ env.obsSpaceDim }}d</span>
              <span>·</span>
              <span>actions: {{ env.actionSpaceSize }}</span>
              @if (env.requiresBox2d) {
                <span>·</span>
                <span class="text-warning">requires Box2D</span>
              }
            </div>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .env-list { display: flex; flex-direction: column; gap: 6px; }

    .env-item {
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      cursor: pointer;
      padding: 10px 12px;
      text-align: left;
      transition: border-color 0.15s, background 0.15s;
      width: 100%;

      &:hover { border-color: var(--text-muted); }
    }

    .env-item--active { border-color: var(--border-focus) !important; background: rgba(79,110,247,.08); }

    .env-item__top {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .env-item__name { font-weight: 600; font-size: 0.875rem; }
    .env-item__desc { font-size: 0.8125rem; line-height: 1.4; margin-bottom: 4px; }
    .env-item__meta { display: flex; font-size: 0.75rem; gap: 4px; }
    .text-warning { color: var(--warning); }
  `],
})
export class GameSelectorComponent implements OnInit {
  @Output() envChanged = new EventEmitter<string>();

  private sessionService = inject(SessionService);

  envs = this.sessionService.environments;
  selected = signal('CartPole-v1');

  ngOnInit(): void {
    this.envChanged.emit(this.selected());
  }

  select(env: EnvironmentDef): void {
    this.selected.set(env.id);
    this.envChanged.emit(env.id);
  }
}
