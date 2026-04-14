import {
  AfterViewInit,
  Component,
  inject,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { SessionService } from '../../core/services/session.service';
import { EpisodeMetric } from '../../core/models/types';

Chart.register(...registerables);

const WINDOW = 200;

@Component({
  selector: 'app-reward-chart',
  standalone: true,
  template: `
    <div class="card chart-card">
      <div class="card__header">
        <h3>Reward</h3>
      </div>
      <div class="chart-wrap">
        <canvas #chartCanvas></canvas>
      </div>
    </div>
  `,
  styles: [`
    .chart-card { min-width: 0; }
    .chart-wrap { height: 200px; position: relative; width: 100%; }
  `],
})
export class RewardChartComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private sessionService = inject(SessionService);
  private sub?: Subscription;
  private chart?: Chart;

  ngAfterViewInit(): void {
    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Reward',
            data: [],
            borderColor: '#4f6ef7',
            backgroundColor: 'rgba(79,110,247,0.08)',
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.2,
            fill: true,
          },
          {
            label: 'Avg (100)',
            data: [],
            borderColor: '#34d399',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.3,
            borderDash: [4, 4],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { labels: { color: '#8b92a8', boxWidth: 12, font: { size: 11 } } },
        },
        scales: {
          x: {
            ticks: { color: '#555d72', maxTicksLimit: 6, font: { size: 10 } },
            grid: { color: '#2e3447' },
          },
          y: {
            ticks: { color: '#555d72', font: { size: 10 } },
            grid: { color: '#2e3447' },
          },
        },
      },
    };

    this.chart = new Chart(this.canvasRef.nativeElement, config);

    this.sub = this.sessionService.episodeMetrics$.subscribe((m: EpisodeMetric) => {
      const data0 = this.chart!.data.datasets[0].data as number[];
      const data1 = this.chart!.data.datasets[1].data as number[];
      const labels = this.chart!.data.labels as string[];

      labels.push(String(m.episode));
      data0.push(m.reward);
      data1.push(m.avg_reward);

      if (labels.length > WINDOW) {
        labels.shift();
        data0.shift();
        data1.shift();
      }

      this.chart!.update('none');
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.chart?.destroy();
  }
}
