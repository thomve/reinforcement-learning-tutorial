import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { WsMessage } from '../models/types';

interface Client {
  ws: WebSocket;
  subscriptions: Set<string>; // sessionIds
}

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Set<Client> = new Set();

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
    console.log(`WebSocket server listening on port ${port}`);
  }

  private handleConnection(ws: WebSocket, _req: IncomingMessage): void {
    const client: Client = { ws, subscriptions: new Set() };
    this.clients.add(client);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as WsMessage;
        if (msg.type === 'subscribe' && msg.sessionId) {
          client.subscriptions.add(msg.sessionId);
        } else if (msg.type === 'unsubscribe' && msg.sessionId) {
          client.subscriptions.delete(msg.sessionId);
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      this.clients.delete(client);
    });

    ws.on('error', () => {
      this.clients.delete(client);
    });
  }

  /** Broadcast an event to all clients subscribed to the given sessionId. */
  broadcastToSession(sessionId: string, payload: Record<string, unknown>): void {
    const msg = JSON.stringify({
      type: 'training_event',
      sessionId,
      payload,
    });
    for (const client of this.clients) {
      if (
        client.subscriptions.has(sessionId) &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.ws.send(msg);
      }
    }
  }

  /** Broadcast a session status change to all subscribed clients. */
  broadcastSessionStatus(
    sessionId: string,
    status: string,
    extra: Record<string, unknown> = {}
  ): void {
    const msg = JSON.stringify({
      type: 'session_status',
      sessionId,
      status,
      ...extra,
    });
    for (const client of this.clients) {
      if (
        client.subscriptions.has(sessionId) &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.ws.send(msg);
      }
    }
  }

  /** Send a message to ALL connected clients (e.g. session list updates). */
  broadcastAll(payload: Record<string, unknown>): void {
    const msg = JSON.stringify(payload);
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(msg);
      }
    }
  }
}
