import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { Chart, ChartConfiguration } from 'chart.js';
import { SessionService } from '../../core/services/session.service';
import { EpisodeMetric } from '../../core/models/types';

const WINDOW = 200;

@Component({
  selector: 'app-loss-chart',
  standalone: true,
  template: `
    <div class="card chart-card">
      <div class="card__header">
        <h3>Loss</h3>
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
export class LossChartComponent implements AfterViewInit, OnDestroy {
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
            label: 'Loss',
            data: [],
            borderColor: '#fbbf24',
            backgroundColor: 'rgba(251,191,36,0.08)',
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.2,
            fill: true,
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
            type: 'linear',
          },
        },
      },
    };

    this.chart = new Chart(this.canvasRef.nativeElement, config);

    this.sub = this.sessionService.episodeMetrics$.subscribe((m: EpisodeMetric) => {
      if (m.loss === null || m.loss === undefined) return;

      const data = this.chart!.data.datasets[0].data as number[];
      const labels = this.chart!.data.labels as string[];

      labels.push(String(m.episode));
      data.push(m.loss);

      if (labels.length > WINDOW) {
        labels.shift();
        data.shift();
      }

      this.chart!.update('none');
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.chart?.destroy();
  }
}
