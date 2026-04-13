import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../core/services/session.service';
import { AlgorithmDef, HyperparamDef } from '../../core/models/types';

@Component({
  selector: 'app-nn-configurator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card">
      <div class="card__header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="5" cy="12" r="2" stroke="var(--accent)" stroke-width="1.5"/>
          <circle cx="19" cy="6" r="2" stroke="var(--accent)" stroke-width="1.5"/>
          <circle cx="19" cy="18" r="2" stroke="var(--accent)" stroke-width="1.5"/>
          <circle cx="12" cy="8" r="2" stroke="var(--accent)" stroke-width="1.5"/>
          <circle cx="12" cy="16" r="2" stroke="var(--accent)" stroke-width="1.5"/>
          <path d="M7 12l3-4M7 12l3 4M14 8l3-2M14 8l3 2M14 16l3 2M14 16l3-2"
            stroke="var(--text-muted)" stroke-width="1"/>
        </svg>
        <h3>Hyperparameters</h3>
      </div>

      <div class="params">
        @for (param of visibleParams(); track param.key) {
          @if (param.type === 'layers') {
            <!-- Hidden Layers configurator -->
            <div class="param-group">
              <label>Hidden Layers</label>
              <div class="layers-editor">
                @for (layer of layers(); track $index) {
                  <div class="layer-row">
                    <input
                      type="number"
                      [ngModel]="layer"
                      (ngModelChange)="updateLayer($index, $event)"
                      min="1" max="1024"
                      class="layer-input"
                    />
                    <button class="btn btn--ghost btn--sm btn--icon"
                      (click)="removeLayer($index)"
                      [disabled]="layers().length <= 1"
                      title="Remove layer">×</button>
                  </div>
                }
                <button class="btn btn--ghost btn--sm" (click)="addLayer()">+ Add Layer</button>
              </div>
            </div>
          } @else if (param.type === 'select') {
            <div class="param-group">
              <label [for]="param.key">{{ param.label }}</label>
              <select
                [id]="param.key"
                [ngModel]="values()[param.key]"
                (ngModelChange)="setValue(param.key, $event)"
              >
                @for (opt of param.options ?? []; track opt) {
                  <option [value]="opt">{{ opt }}</option>
                }
              </select>
            </div>
          } @else {
            <div class="param-group">
              <div class="param-label-row">
                <label [for]="param.key">{{ param.label }}</label>
                <span class="param-value text-mono">{{ values()[param.key] }}</span>
              </div>
              <input
                type="range"
                [id]="param.key"
                [ngModel]="values()[param.key]"
                (ngModelChange)="setValue(param.key, $event)"
                [min]="param.min ?? 0"
                [max]="param.max ?? 1"
                [step]="param.step ?? (param.type === 'integer' ? 1 : 0.001)"
              />
            </div>
          }
        }
      </div>

      <!-- Training config -->
      <div class="section-divider">Training</div>
      <div class="params">
        <div class="param-group">
          <div class="param-label-row">
            <label>Max Episodes</label>
            <span class="param-value text-mono">{{ trainingConfig().max_episodes }}</span>
          </div>
          <input type="range"
            [ngModel]="trainingConfig().max_episodes"
            (ngModelChange)="updateTraining('max_episodes', +$event)"
            min="50" max="2000" step="50"
          />
        </div>
        <div class="param-group">
          <div class="param-label-row">
            <label>Render Every N Steps</label>
            <span class="param-value text-mono">{{ trainingConfig().render_every_n_steps }}</span>
          </div>
          <input type="range"
            [ngModel]="trainingConfig().render_every_n_steps"
            (ngModelChange)="updateTraining('render_every_n_steps', +$event)"
            min="1" max="50" step="1"
          />
        </div>
        <div class="param-group param-group--inline">
          <label>Enable Rendering</label>
          <input type="checkbox"
            [ngModel]="trainingConfig().render"
            (ngModelChange)="updateTraining('render', $event)"
          />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .params { display: flex; flex-direction: column; gap: 10px; }

    .param-group { display: flex; flex-direction: column; gap: 4px; }
    .param-group--inline { align-items: center; flex-direction: row; justify-content: space-between; }

    .param-label-row {
      align-items: center;
      display: flex;
      justify-content: space-between;
    }

    .param-value {
      color: var(--accent);
      font-size: 0.8125rem;
    }

    input[type='range'] {
      accent-color: var(--accent);
      cursor: pointer;
      padding: 0;
      width: 100%;
    }

    input[type='checkbox'] {
      accent-color: var(--accent);
      cursor: pointer;
      height: 16px;
      width: 16px;
    }

    .section-divider {
      border-top: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      margin: 8px 0 4px;
      padding-top: 10px;
      text-transform: uppercase;
    }

    .layers-editor { display: flex; flex-direction: column; gap: 6px; }

    .layer-row { align-items: center; display: flex; gap: 6px; }

    .layer-input { flex: 1; }
  `],
})
export class NnConfiguratorComponent implements OnChanges {
  @Input() algorithmId = 'dqn';
  @Output() configChanged = new EventEmitter<Record<string, unknown>>();

  private sessionService = inject(SessionService);

  layers = signal<number[]>([64, 64]);
  values = signal<Record<string, unknown>>({});
  trainingConfig = signal({
    max_episodes: 500,
    render_every_n_steps: 10,
    render: true,
    max_steps_per_episode: 1000,
  });

  visibleParams = signal<HyperparamDef[]>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['algorithmId']) {
      this.rebuildFromAlgorithm();
    }
  }

  private rebuildFromAlgorithm(): void {
    const algs = this.sessionService.algorithms();
    const alg = algs.find((a) => a.id === this.algorithmId);
    if (!alg) return;

    // Filter out 'layers' type from visible params list (rendered separately)
    this.visibleParams.set(alg.hyperparameters.filter((p) => p.type !== 'layers'));

    // Apply defaults
    const defaults: Record<string, unknown> = {};
    for (const p of alg.hyperparameters) {
      if (p.type === 'layers') {
        this.layers.set((p.default as number[]) ?? [64, 64]);
      } else {
        defaults[p.key] = p.default;
      }
    }
    this.values.set(defaults);
    this.emit();
  }

  setValue(key: string, value: unknown): void {
    const param = this.visibleParams().find((p) => p.key === key);
    const parsed = param?.type === 'integer' ? parseInt(String(value), 10) : +(value as number);
    this.values.update((v) => ({ ...v, [key]: isNaN(parsed as number) ? value : parsed }));
    this.emit();
  }

  addLayer(): void {
    this.layers.update((l) => [...l, 64]);
    this.emit();
  }

  removeLayer(idx: number): void {
    this.layers.update((l) => l.filter((_, i) => i !== idx));
    this.emit();
  }

  updateLayer(idx: number, value: number): void {
    this.layers.update((l) => l.map((n, i) => (i === idx ? +value : n)));
    this.emit();
  }

  updateTraining(key: string, value: unknown): void {
    this.trainingConfig.update((c) => ({ ...c, [key]: value }));
    this.emit();
  }

  private emit(): void {
    const config = {
      ...this.values(),
      hidden_layers: this.layers(),
      _training: this.trainingConfig(),
    };
    this.configChanged.emit(config);
  }
}
