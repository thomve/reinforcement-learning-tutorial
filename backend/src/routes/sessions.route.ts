import { Router, Request, Response } from 'express';
import { SessionManagerService } from '../services/session-manager.service';

export function createSessionsRouter(manager: SessionManagerService): Router {
  const router = Router();

  // List all sessions
  router.get('/', (_req: Request, res: Response) => {
    res.json(manager.getSessions());
  });

  // Get a specific session
  router.get('/:id', (req: Request, res: Response) => {
    const session = manager.getSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  });

  // Create a new training session
  router.post('/', (req: Request, res: Response) => {
    try {
      const session = manager.createSession(req.body);
      res.status(201).json(session);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes('Max concurrent') ? 429 : 400;
      res.status(status).json({ error: message });
    }
  });

  // Control a session (pause/resume/stop/reset)
  router.post('/:id/control', (req: Request, res: Response) => {
    const { action } = req.body as { action: string };
    const validActions = ['pause', 'resume', 'stop', 'reset'];
    if (!validActions.includes(action)) {
      res.status(400).json({ error: `action must be one of: ${validActions.join(', ')}` });
      return;
    }
    try {
      manager.sendControl(req.params.id, action as 'pause' | 'resume' | 'stop' | 'reset');
      res.json({ ok: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(404).json({ error: message });
    }
  });

  // Delete a session
  router.delete('/:id', (req: Request, res: Response) => {
    manager.deleteSession(req.params.id);
    res.status(204).send();
  });

  return router;
}
