import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-episode-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card stats-card">
      <div class="card__header">
        <h3>Episode Stats</h3>
        @if (sessionService.device()) {
          <span class="text-muted text-mono" style="font-size:0.75rem;margin-left:auto">
            {{ sessionService.device() }}
          </span>
        }
      </div>

      <!-- Summary row -->
      <div class="stats-summary">
        <div class="stat-box">
          <span class="stat-box__label">Episode</span>
          <span class="stat-box__value">{{ sessionService.currentEpisode() || '—' }}</span>
        </div>
        <div class="stat-box">
          <span class="stat-box__label">Best Reward</span>
          <span class="stat-box__value text-success">
            {{ sessionService.bestReward() | number:'1.1-1' }}
          </span>
        </div>
        @if (latest(); as ep) {
          <div class="stat-box">
            <span class="stat-box__label">Avg (100)</span>
            <span class="stat-box__value">{{ ep.avg_reward | number:'1.1-1' }}</span>
          </div>
          @if (ep.epsilon !== undefined) {
            <div class="stat-box">
              <span class="stat-box__label">Epsilon</span>
              <span class="stat-box__value text-mono">{{ ep.epsilon | number:'1.3-3' }}</span>
            </div>
          }
        }
      </div>

      <!-- Recent episodes table -->
      @if (recentEpisodes().length > 0) {
        <div class="table-wrapper">
          <table class="ep-table">
            <thead>
              <tr>
                <th>Ep</th>
                <th>Reward</th>
                <th>Steps</th>
                <th>Loss</th>
              </tr>
            </thead>
            <tbody>
              @for (ep of recentEpisodes(); track ep.episode) {
                <tr>
                  <td class="text-mono">{{ ep.episode }}</td>
                  <td [class.text-success]="ep.reward > 0" [class.text-danger]="ep.reward < 0">
                    {{ ep.reward | number:'1.1-1' }}
                  </td>
                  <td class="text-mono">{{ ep.steps }}</td>
                  <td class="text-mono text-muted">{{ ep.loss !== null ? (ep.loss | number:'1.4-4') : '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <p class="text-muted" style="font-size:0.8125rem;text-align:center;padding:16px 0">
          No episodes yet — start training to see results.
        </p>
      }
    </div>
  `,
  styles: [`
    .stats-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }

    .stat-box {
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 80px;
      padding: 8px 12px;
      text-align: center;
    }

    .stat-box__label {
      color: var(--text-muted);
      font-size: 0.7rem;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .stat-box__value {
      font-size: 1.1rem;
      font-weight: 600;
      margin-top: 2px;
    }

    .table-wrapper {
      max-height: 200px;
      overflow-y: auto;
    }

    .ep-table {
      border-collapse: collapse;
      font-size: 0.8125rem;
      width: 100%;

      th {
        background: var(--bg-elevated);
        color: var(--text-muted);
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.05em;
        padding: 6px 8px;
        position: sticky;
        text-align: right;
        text-transform: uppercase;
        top: 0;

        &:first-child { text-align: left; }
      }

      td {
        border-top: 1px solid var(--border);
        padding: 5px 8px;
        text-align: right;

        &:first-child { text-align: left; }
      }

      tr:hover td { background: var(--bg-elevated); }
    }
  `],
})
export class EpisodeStatsComponent {
  sessionService = inject(SessionService);

  latest() {
    const h = this.sessionService.episodeHistory();
    return h.length > 0 ? h[h.length - 1] : null;
  }

  recentEpisodes() {
    const h = this.sessionService.episodeHistory();
    return h.slice(-20).reverse();
  }
}
