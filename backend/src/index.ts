import { createApp } from './app';
import { WebSocketService } from './services/websocket.service';
import { SessionManagerService } from './services/session-manager.service';

const HTTP_PORT = parseInt(process.env.PORT ?? '3000', 10);
const WS_PORT = parseInt(process.env.WS_PORT ?? '3001', 10);

const wsService = new WebSocketService(WS_PORT);
const sessionManager = new SessionManagerService(wsService);
const app = createApp(sessionManager);

app.listen(HTTP_PORT, () => {
  console.log(`HTTP API listening on http://localhost:${HTTP_PORT}`);
  console.log(`WebSocket server on ws://localhost:${WS_PORT}`);
});
