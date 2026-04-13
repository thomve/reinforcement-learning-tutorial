import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable, timer } from 'rxjs';

export interface WsEvent {
  type: string;
  sessionId?: string;
  payload?: Record<string, unknown>;
  status?: string;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentSubscriptions = new Set<string>();

  private messageSubject = new Subject<WsEvent>();
  readonly messages$: Observable<WsEvent> = this.messageSubject.asObservable();

  private wsUrl = `ws://${window.location.hostname}:3001`;

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      console.log('[WS] Connected');
      // Resubscribe to any sessions after reconnect
      for (const id of this.currentSubscriptions) {
        this.subscribe(id);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WsEvent;
        this.messageSubject.next(msg);
      } catch {
        // ignore
      }
    };

    this.ws.onclose = () => {
      console.log('[WS] Disconnected — reconnecting in 3s');
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  subscribe(sessionId: string): void {
    this.currentSubscriptions.add(sessionId);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', sessionId }));
    }
  }

  unsubscribe(sessionId: string): void {
    this.currentSubscriptions.delete(sessionId);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', sessionId }));
    }
  }

  ngOnDestroy(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}
