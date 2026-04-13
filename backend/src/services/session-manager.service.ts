import { v4 as uuidv4 } from 'uuid';
import { Session, SessionConfig, SessionStatus } from '../models/types';
import { PythonProcess } from './python-process.service';
import { WebSocketService } from './websocket.service';

const MAX_CONCURRENT_SESSIONS = 3;

export class SessionManagerService {
  private sessions = new Map<string, Session>();
  private processes = new Map<string, PythonProcess>();
  private wsService: WebSocketService;

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
  }

  getSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  createSession(partialConfig: Omit<SessionConfig, 'type' | 'session_id'>): Session {
    const activeCount = Array.from(this.sessions.values()).filter(
      (s) => s.status === 'training' || s.status === 'paused'
    ).length;

    if (activeCount >= MAX_CONCURRENT_SESSIONS) {
      throw new Error(
        `Max concurrent sessions (${MAX_CONCURRENT_SESSIONS}) reached. Stop an existing session first.`
      );
    }

    const sessionId = uuidv4();
    const config: SessionConfig = {
      type: 'init',
      session_id: sessionId,
      ...partialConfig,
    };

    const session: Session = {
      id: sessionId,
      config,
      status: 'created',
      createdAt: Date.now(),
    };

    this.sessions.set(sessionId, session);
    this.spawnPython(session);
    return session;
  }

  private spawnPython(session: Session): void {
    const proc = new PythonProcess({
      onMessage: (msg) => this.handlePythonMessage(session.id, msg),
      onError: (err) => {
        console.error(`[session ${session.id}] Python process error:`, err.message);
        this.updateSession(session.id, {
          status: 'error',
          errorMessage: err.message,
        });
        this.wsService.broadcastSessionStatus(session.id, 'error', {
          message: err.message,
        });
      },
      onClose: (code) => {
        console.log(`[session ${session.id}] Python process exited with code ${code}`);
        this.processes.delete(session.id);
        const s = this.sessions.get(session.id);
        if (s && s.status !== 'complete' && s.status !== 'error') {
          this.updateSession(session.id, { status: 'stopped' });
          this.wsService.broadcastSessionStatus(session.id, 'stopped');
        }
      },
    });

    this.processes.set(session.id, proc);
    proc.start(session.config as unknown as Record<string, unknown>);
  }

  private handlePythonMessage(
    sessionId: string,
    msg: Record<string, unknown>
  ): void {
    const msgType = msg['type'] as string;

    // Update session state from key events
    if (msgType === 'init_ack') {
      this.updateSession(sessionId, {
        status: 'training',
        device: msg['device'] as string,
      });
      this.wsService.broadcastSessionStatus(sessionId, 'training', {
        device: msg['device'],
      });
    } else if (msgType === 'episode_end') {
      const reward = msg['best_reward'] as number | undefined;
      const episode = msg['episode'] as number | undefined;
      this.updateSession(sessionId, {
        bestReward: reward,
        currentEpisode: episode,
      });
    } else if (msgType === 'training_complete') {
      this.updateSession(sessionId, {
        status: 'complete',
        bestReward: msg['best_reward'] as number,
        totalEpisodes: msg['total_episodes'] as number,
      });
      this.wsService.broadcastSessionStatus(sessionId, 'complete', {
        best_reward: msg['best_reward'],
        total_episodes: msg['total_episodes'],
      });
    } else if (msgType === 'status') {
      const newStatus = msg['status'] as SessionStatus;
      this.updateSession(sessionId, { status: newStatus });
      this.wsService.broadcastSessionStatus(sessionId, newStatus);
      return; // Already broadcast, skip the training_event below
    } else if (msgType === 'error' && msg['fatal']) {
      this.updateSession(sessionId, {
        status: 'error',
        errorMessage: msg['message'] as string,
      });
      this.wsService.broadcastSessionStatus(sessionId, 'error', {
        message: msg['message'],
      });
    }

    // Forward all events to subscribed WebSocket clients
    // Skip frames in the main broadcast — they go directly to save bandwidth routing
    this.wsService.broadcastToSession(sessionId, msg);
  }

  sendControl(sessionId: string, action: 'pause' | 'resume' | 'stop' | 'reset'): void {
    const proc = this.processes.get(sessionId);
    if (!proc) throw new Error(`No active process for session ${sessionId}`);

    if (action === 'stop') {
      proc.stop();
      this.updateSession(sessionId, { status: 'stopped' });
    } else if (action === 'reset') {
      // Stop current, remove, caller can create new
      proc.stop();
      this.sessions.delete(sessionId);
      this.processes.delete(sessionId);
    } else {
      proc.sendControl({ type: action });
      if (action === 'pause') {
        this.updateSession(sessionId, { status: 'paused' });
      } else if (action === 'resume') {
        this.updateSession(sessionId, { status: 'training' });
      }
    }
  }

  deleteSession(sessionId: string): void {
    const proc = this.processes.get(sessionId);
    if (proc) proc.stop();
    this.processes.delete(sessionId);
    this.sessions.delete(sessionId);
  }

  private updateSession(
    sessionId: string,
    updates: Partial<Session>
  ): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
    }
  }
}
