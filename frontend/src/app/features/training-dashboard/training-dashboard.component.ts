import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../core/services/session.service';
import { GameSelectorComponent } from '../game-selector/game-selector.component';
import { AlgorithmSelectorComponent } from '../algorithm-selector/algorithm-selector.component';
import { NnConfiguratorComponent } from '../nn-configurator/nn-configurator.component';
import { ControlPanelComponent } from '../control-panel/control-panel.component';
import { RewardChartComponent } from '../reward-chart/reward-chart.component';
import { LossChartComponent } from '../loss-chart/loss-chart.component';
import { EpisodeStatsComponent } from '../episode-stats/episode-stats.component';
import { GameRendererComponent } from '../game-renderer/game-renderer.component';
import { CreateSessionRequest } from '../../core/models/types';

@Component({
  selector: 'app-training-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    GameSelectorComponent,
    AlgorithmSelectorComponent,
    NnConfiguratorComponent,
    ControlPanelComponent,
    RewardChartComponent,
    LossChartComponent,
    EpisodeStatsComponent,
    GameRendererComponent,
  ],
  template: `
    <div class="dashboard">
      <!-- Header -->
      <header class="dashboard__header">
        <div class="dashboard__brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="var(--accent)" stroke-width="1.5"/>
            <path d="M8 12l3 3 5-5" stroke="var(--success)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>RL Tutorial</span>
        </div>
        <div class="dashboard__meta" *ngIf="sessionService.session()">
          <span class="badge badge--{{ sessionService.status() }}">
            {{ sessionService.status() }}
          </span>
          <span class="text-muted text-mono" *ngIf="sessionService.device()">
            {{ sessionService.device() }}
          </span>
          <span class="text-secondary" *ngIf="sessionService.currentEpisode() > 0">
            Ep {{ sessionService.currentEpisode() }}
          </span>
        </div>
      </header>

      <main class="dashboard__body">
        <!-- Config panel -->
        <aside class="dashboard__config" [class.dashboard__config--disabled]="isTraining()">
          <app-game-selector (envChanged)="onEnvChanged($event)" />
          <app-algorithm-selector
            [selectedEnvId]="selectedEnvId"
            (algorithmChanged)="onAlgorithmChanged($event)"
          />
          <app-nn-configurator
            [algorithmId]="selectedAlgorithmId"
            (configChanged)="onNnConfigChanged($event)"
          />
          <app-control-panel
            [status]="sessionService.status()"
            (start)="onStart()"
            (pause)="sessionService.pause()"
            (resume)="sessionService.resume()"
            (stop)="sessionService.stop()"
            (reset)="sessionService.reset()"
          />
        </aside>

        <!-- Visualization panel -->
        <section class="dashboard__viz">
          <app-game-renderer />
          <div class="dashboard__charts">
            <app-reward-chart />
            <app-loss-chart />
          </div>
          <app-episode-stats />
        </section>
      </main>
    </div>
  `,
  styleUrl: './training-dashboard.component.scss',
})
export class TrainingDashboardComponent {
  sessionService = inject(SessionService);

  selectedEnvId = 'CartPole-v1';
  selectedAlgorithmId: string = 'dqn';
  nnConfig: Record<string, unknown> = {};
  trainingConfig = {
    max_episodes: 500,
    render_every_n_steps: 10,
    render: true,
    max_steps_per_episode: 1000,
  };

  isTraining = computed(
    () =>
      this.sessionService.status() === 'training' ||
      this.sessionService.status() === 'paused'
  );

  onEnvChanged(envId: string): void {
    this.selectedEnvId = envId;
  }

  onAlgorithmChanged(algId: string): void {
    this.selectedAlgorithmId = algId;
    this.nnConfig = {};
  }

  onNnConfigChanged(cfg: Record<string, unknown>): void {
    const { _training, ...nnCfg } = cfg;
    this.nnConfig = nnCfg;
    if (_training) {
      this.trainingConfig = _training as typeof this.trainingConfig;
    }
  }

  onStart(): void {
    const req: CreateSessionRequest = {
      env: this.selectedEnvId,
      algorithm: this.selectedAlgorithmId as CreateSessionRequest['algorithm'],
      nn_config: this.nnConfig as CreateSessionRequest['nn_config'],
      training: this.trainingConfig,
    };
    this.sessionService.startTraining(req);
  }
}
