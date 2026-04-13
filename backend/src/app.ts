import express from 'express';
import cors from 'cors';
import path from 'path';
import { createSessionsRouter } from './routes/sessions.route';
import { createMetaRouter } from './routes/meta.route';
import { SessionManagerService } from './services/session-manager.service';
import { WebSocketService } from './services/websocket.service';

export function createApp(
  sessionManager: SessionManagerService
): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // API routes
  app.use('/api/v1/sessions', createSessionsRouter(sessionManager));
  app.use('/api/v1', createMetaRouter());

  // Serve Angular build only when it exists (production)
  const angularDist = path.resolve(__dirname, '../../frontend/dist/frontend/browser');
  const indexHtml = path.join(angularDist, 'index.html');
  if (require('fs').existsSync(indexHtml)) {
    app.use(express.static(angularDist));
    app.get(/.*/, (_req, res) => res.sendFile(indexHtml));
  }

  return app;
}
