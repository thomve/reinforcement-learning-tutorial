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

      <!-- ── Header ──────────────────────────────────────────── -->
      <header class="dashboard__header">
        <div class="dashboard__brand">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <polygon points="12,2 22,20 2,20"
              stroke="var(--accent)" stroke-width="1.5"
              stroke-linejoin="round" fill="rgba(79,110,247,.12)"/>
            <line x1="12" y1="9" x2="12" y2="14"
              stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="12" cy="17" r="0.8" fill="var(--accent)"/>
          </svg>
          <span class="brand-name">RL <span class="brand-accent">Control</span></span>
        </div>

        <!-- Live metrics — only shown once a session is running -->
        @if (sessionService.currentEpisode() > 0) {
          <div class="dashboard__live-metrics">
            <div class="live-metric">
              <span class="live-metric__label">Episode</span>
              <span class="live-metric__value">{{ sessionService.currentEpisode() }}</span>
            </div>
            <div class="live-metric-sep"></div>
            <div class="live-metric">
              <span class="live-metric__label">Best</span>
              <span class="live-metric__value live-metric__value--good">
                {{ sessionService.bestReward() | number:'1.1-1' }}
              </span>
            </div>
          </div>
        }

        <div class="dashboard__header-end">
          @if (sessionService.device()) {
            <span class="device-chip">{{ sessionService.device() }}</span>
          }
          <span class="badge badge--{{ sessionService.status() }}">
            {{ sessionService.status() }}
          </span>
        </div>
      </header>

      <!-- ── Body ────────────────────────────────────────────── -->
      <div class="dashboard__body">

        <!-- Left: config sidebar -->
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
          <div class="config-spacer"></div>
          <app-control-panel
            [status]="sessionService.status()"
            (start)="onStart()"
            (pause)="sessionService.pause()"
            (resume)="sessionService.resume()"
            (stop)="sessionService.stop()"
            (reset)="sessionService.reset()"
          />
        </aside>

        <!-- Center: renderer + charts -->
        <main class="dashboard__main">
          <app-game-renderer />
          <div class="dashboard__charts">
            <app-reward-chart />
            <app-loss-chart />
          </div>
        </main>

        <!-- Right: live HUD stats -->
        <aside class="dashboard__hud">
          <app-episode-stats />
        </aside>

      </div>
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
      nn_config: this.nnConfig as unknown as CreateSessionRequest['nn_config'],
      training: this.trainingConfig,
    };
    this.sessionService.startTraining(req);
  }
}
