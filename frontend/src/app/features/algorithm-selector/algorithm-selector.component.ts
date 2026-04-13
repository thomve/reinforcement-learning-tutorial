import { Component, EventEmitter, inject, Input, OnInit, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../core/services/session.service';
import { AlgorithmDef } from '../../core/models/types';

@Component({
  selector: 'app-algorithm-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <div class="card__header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h3>Algorithm</h3>
      </div>

      <div class="alg-list">
        @for (alg of compatibleAlgorithms(); track alg.id) {
          <button
            class="alg-item"
            [class.alg-item--active]="selected() === alg.id"
            (click)="select(alg)"
          >
            <span class="alg-item__name">{{ alg.displayName }}</span>
            <p class="alg-item__desc text-secondary">{{ alg.description }}</p>
          </button>
        }
        @if (compatibleAlgorithms().length === 0) {
          <p class="text-muted" style="font-size:0.8125rem">No algorithms available for this environment.</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .alg-list { display: flex; flex-direction: column; gap: 6px; }

    .alg-item {
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

    .alg-item--active { border-color: var(--border-focus) !important; background: rgba(79,110,247,.08); }

    .alg-item__name { display: block; font-weight: 600; font-size: 0.875rem; margin-bottom: 4px; }
    .alg-item__desc { font-size: 0.8125rem; line-height: 1.4; }
  `],
})
export class AlgorithmSelectorComponent implements OnInit {
  @Input() selectedEnvId = 'CartPole-v1';
  @Output() algorithmChanged = new EventEmitter<string>();

  private sessionService = inject(SessionService);

  algorithms = this.sessionService.algorithms;
  selected = signal('dqn');

  compatibleAlgorithms = computed(() => {
    const envs = this.sessionService.environments();
    const env = envs.find((e) => e.id === this.selectedEnvId);
    if (!env) return this.algorithms();
    return this.algorithms().filter((a) => env.compatibleAlgorithms.includes(a.id));
  });

  ngOnInit(): void {
    this.algorithmChanged.emit(this.selected());
  }

  select(alg: AlgorithmDef): void {
    this.selected.set(alg.id);
    this.algorithmChanged.emit(alg.id);
  }
}
