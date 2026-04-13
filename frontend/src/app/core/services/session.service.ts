import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import { Subject, Subscription, filter } from 'rxjs';
import { ApiService } from './api.service';
import { WebSocketService } from './websocket.service';
import {
  AlgorithmDef,
  CreateSessionRequest,
  EnvironmentDef,
  EpisodeMetric,
  Session,
  SessionStatus,
} from '../models/types';

const MAX_HISTORY = 500;

@Injectable({ providedIn: 'root' })
export class SessionService implements OnDestroy {
  // ── Metadata ────────────────────────────────────────────────────────────────
  readonly environments = signal<EnvironmentDef[]>([]);
  readonly algorithms = signal<AlgorithmDef[]>([]);

  // ── Active Session ───────────────────────────────────────────────────────────
  readonly session = signal<Session | null>(null);
  readonly status = computed<SessionStatus>(() => this.session()?.status ?? 'created');
  readonly device = computed(() => this.session()?.device);
  readonly episodeHistory = signal<EpisodeMetric[]>([]);
  readonly bestReward = computed(() =>
    this.episodeHistory().reduce((best, e) => Math.max(best, e.reward), -Infinity)
  );
  readonly currentEpisode = computed(() =>
    this.episodeHistory().length > 0
      ? this.episodeHistory()[this.episodeHistory().length - 1].episode
      : 0
  );

  // ── Streams ──────────────────────────────────────────────────────────────────
  readonly frames$ = new Subject<string>();
  readonly episodeMetrics$ = new Subject<EpisodeMetric>();

  private wsSub?: Subscription;

  constructor(
    private api: ApiService,
    private ws: WebSocketService
  ) {
    this.loadMeta();
    this.ws.connect();
    this.wsSub = this.ws.messages$.subscribe((msg) => this.handleWsMessage(msg));
  }

  private loadMeta(): void {
    this.api.getEnvironments().subscribe((envs) => this.environments.set(envs));
    this.api.getAlgorithms().subscribe((algs) => this.algorithms.set(algs));
  }

  startTraining(config: CreateSessionRequest): void {
    this.episodeHistory.set([]);
    this.api.createSession(config).subscribe({
      next: (sess) => {
        this.session.set(sess);
        this.ws.subscribe(sess.id);
      },
      error: (err) => {
        console.error('Failed to create session:', err);
        alert(err?.error?.error ?? 'Failed to start training');
      },
    });
  }

  pause(): void {
    const id = this.session()?.id;
    if (id) this.api.controlSession(id, 'pause').subscribe();
  }

  resume(): void {
    const id = this.session()?.id;
    if (id) this.api.controlSession(id, 'resume').subscribe();
  }

  stop(): void {
    const id = this.session()?.id;
    if (id) this.api.controlSession(id, 'stop').subscribe();
  }

  reset(): void {
    const id = this.session()?.id;
    if (id) {
      this.ws.unsubscribe(id);
      this.api.deleteSession(id).subscribe();
    }
    this.session.set(null);
    this.episodeHistory.set([]);
  }

  private handleWsMessage(msg: Record<string, unknown>): void {
    const msgType = msg['type'] as string;
    const sessionId = msg['sessionId'] as string | undefined;

    if (sessionId && sessionId !== this.session()?.id) return;

    if (msgType === 'session_status') {
      const curr = this.session();
      if (curr) {
        const updated: Session = {
          ...curr,
          status: msg['status'] as SessionStatus,
        };
        if (msg['device']) updated.device = msg['device'] as string;
        this.session.set(updated);
      }
      return;
    }

    if (msgType === 'training_event') {
      const payload = msg['payload'] as Record<string, unknown>;
      if (!payload) return;
      const pType = payload['type'] as string;

      if (pType === 'frame') {
        const frame = payload['frame'] as string;
        if (frame) this.frames$.next(frame);
        return;
      }

      if (pType === 'episode_end') {
        const metric: EpisodeMetric = {
          episode: payload['episode'] as number,
          reward: payload['reward'] as number,
          avg_reward: payload['avg_reward'] as number,
          best_reward: payload['best_reward'] as number,
          steps: payload['steps'] as number,
          loss: payload['loss'] as number | null,
          timestamp: payload['timestamp'] as number,
          epsilon: payload['epsilon'] as number | undefined,
        };
        this.episodeMetrics$.next(metric);
        this.episodeHistory.update((h) => {
          const next = [...h, metric];
          return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
        });

        // Sync best_reward into session
        const curr = this.session();
        if (curr) {
          this.session.set({ ...curr, bestReward: metric.best_reward, currentEpisode: metric.episode });
        }
        return;
      }

      if (pType === 'training_complete' || pType === 'init_ack' || pType === 'status') {
        const curr = this.session();
        if (curr && pType === 'init_ack') {
          this.session.set({ ...curr, device: payload['device'] as string });
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
  }
}
