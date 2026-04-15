# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies (Node workspaces + Python)
npm install
pip install -r python/requirements.txt         # activate venv first
pip install gymnasium[box2d]                   # only needed for LunarLander

# Development (backend + frontend in parallel)
npm run dev                                    # both servers
npm run dev:backend                            # Node.js only  (ts-node-dev, hot-reload)
npm run dev:frontend                           # Angular only  (ng serve --proxy)

# Production build
npm run build                                  # Angular → frontend/dist/, tsc → backend/dist/
node backend/dist/index.js                     # serve production build

# Backend TypeScript check / compile only
cd backend && npx tsc --noEmit                 # type-check without emitting
```

There are no test or lint scripts configured in this project.

## Architecture

The app has three independent layers that communicate over well-defined interfaces.

### Communication flow

```
Angular (4200) ──REST /api──► Node.js (3000) ──spawn──► Python subprocess
               │                                   │
               └◄──────── WebSocket (3001) ◄───────┘
                          (JSON-Lines relayed live)
```

1. Frontend POSTs to `/api/sessions` with a config object.
2. `SessionManagerService` (Node) spawns a Python process, writes the JSON config as the first stdin line, and stores the `Session`.
3. Python (`main.py` → `Trainer`) emits **JSON-Lines** on stdout throughout training.
4. Node reads stdout line by line and broadcasts each parsed message to WebSocket clients subscribed to that session.
5. Control commands (pause/resume/stop) flow back from Node to Python via stdin.

### Python RL engine (`python/`)

- `main.py` — entry point: reads one JSON line from stdin, validates it with Pydantic (`utils/config_schema.py`), detects the torch device, then delegates to `Trainer`.
- `training/trainer.py` — main training loop. Creates the Gymnasium env, instantiates the agent via `create_agent()`, runs episodes, and emits all protocol messages. Pause/stop control is handled by a background thread reading stdin.
- `algorithms/<algo>/agent.py` — each algorithm extends `BaseAgent` (`algorithms/base_agent.py`). Must implement `select_action`, `store_transition`, `train_step`, `episode_end`, `get_metrics`.
- `environments/registry.py` — environment metadata (obs dims, action space, solved threshold).
- `utils/frame_encoder.py` — converts NumPy RGB arrays to base64 PNG strings for the `frame` event.

### Node.js backend (`backend/src/`)

- `services/python-process.service.ts` — low-level subprocess wrapper. Spawns Python with `cwd=python/`, pipes stdin/stdout, auto-detects the venv Python executable (checks `.venv/` then `venv/` then PATH). Force-kills after a 5 s grace period on stop.
- `services/session-manager.service.ts` — session lifecycle. Caps concurrent active sessions at 3. Maps `init_ack` / `episode_end` / `training_complete` / `status` / `error` Python events to session state updates.
- `services/websocket.service.ts` — WebSocket server on a separate port. Clients subscribe by session ID; messages are broadcast per-session.
- `routes/meta.route.ts` — static `/api/meta/environments` and `/api/meta/algorithms` endpoints. **This is the single source of truth for hyperparameter schemas** — frontend and Python both depend on the field names defined here.

### Angular frontend (`frontend/src/app/`)

- Uses standalone components and Angular signals throughout (no NgModules).
- `core/services/session.service.ts` — holds session state, issues REST calls, manages the WebSocket subscription, and exposes observables/signals consumed by feature components.
- `features/control-panel/` — Start / Pause / Resume / Stop / Reset buttons driven purely by `SessionStatus`.
- `features/episode-stats/` — live chart rendering (Chart.js) fed by `episode_end` WebSocket events.
- Angular dev server proxies `/api` to `localhost:3000` via `frontend/proxy.conf.json`. WebSocket connects directly to port 3001.

### JSON-Lines protocol (Python ↔ Node)

| `type` | Direction | Key fields |
|--------|-----------|------------|
| `init_ack` | Python → Node | `session_id`, `device` |
| `status` | Python → Node | `status`: `training` \| `paused` \| `stopped` |
| `episode_end` | Python → Node | `episode`, `reward`, `avg_reward`, `best_reward`, `steps`, `loss` + algo-specific metrics |
| `frame` | Python → Node | `episode`, `step`, `frame` (base64 PNG) |
| `training_complete` | Python → Node | `total_episodes`, `best_reward` |
| `error` | Python → Node | `message`, `fatal` |
| `pause` / `resume` / `stop` | Node → Python | written to stdin |

### Extending the project

**New algorithm:**
1. `python/algorithms/<algo>/agent.py` — implement `BaseAgent`.
2. `python/training/trainer.py` — add a branch in `create_agent()`.
3. `backend/src/routes/meta.route.ts` — add entry to `ALGORITHMS` with hyperparameter schema.

**New environment:**
1. `python/environments/registry.py` — add entry.
2. `backend/src/routes/meta.route.ts` — add entry to `ENVIRONMENTS`.

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | HTTP API port |
| `WS_PORT` | `3001` | WebSocket port |
| `PYTHON_EXECUTABLE` | auto-detected | Override Python binary path |
