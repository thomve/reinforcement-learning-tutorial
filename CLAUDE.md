# CLAUDE.md

## Project overview

Interactive full-stack application for exploring reinforcement learning algorithms through a live UI. Users select an environment and algorithm, configure hyperparameters, and watch training unfold in real time via live charts and a game preview stream.

**Stack:**
- **Frontend:** Angular 18 (standalone components, signals) + Chart.js — `frontend/`
- **Backend:** Node.js + Express + WebSocket (`ws`) — `backend/`
- **RL engine:** Python + PyTorch + Gymnasium — `python/`

---

## Development

```bash
# Install Node dependencies (both workspaces)
npm install

# Install Python dependencies
pip install -r python/requirements.txt

# Run backend + frontend in parallel
npm run dev
```

- Angular dev server: http://localhost:4200
- Node.js HTTP API: http://localhost:3000
- WebSocket server: ws://localhost:3001

The Angular proxy (`frontend/proxy.conf.json`) forwards `/api` calls to the backend. The WebSocket connects directly to port 3001.

---

## Architecture & communication flow

```
Angular (4200) ──REST──► Node.js (3000) ──spawn──► Python process
               │                            │
               │◄──WebSocket (3001)──────────┘
               │   (JSON-Lines relayed live)
```

1. The frontend POSTs to `/api/sessions` with a config payload.
2. Node.js (`SessionManagerService`) spawns a Python subprocess, writes the JSON config to its stdin, and registers the session.
3. Python (`main.py` → `Trainer`) emits **JSON-Lines** on stdout during training.
4. Node.js relays every line to subscribed WebSocket clients.
5. The frontend consumes the stream to update charts and the frame preview.

**Control commands** (pause/resume/stop) flow back from Node.js to the Python process via stdin JSON-Lines.

---

## Key files

| File | Role |
|------|------|
| `python/main.py` | Python entry point — reads config from stdin, emits `init_ack`, delegates to `Trainer` |
| `python/training/trainer.py` | Main training loop — creates the Gymnasium env, instantiates the agent, emits `episode_end` / `frame` / `training_complete` events |
| `python/utils/config_schema.py` | Pydantic config schema shared between all algorithms |
| `backend/src/services/session-manager.service.ts` | Session lifecycle — spawn, control, status tracking |
| `backend/src/services/python-process.service.ts` | Low-level Python subprocess wrapper (spawn, stdin/stdout piping, kill) |
| `backend/src/services/websocket.service.ts` | WebSocket server — broadcast events to subscribed clients |
| `backend/src/routes/meta.route.ts` | Static metadata for environments and algorithms (hyperparameter schemas) |
| `frontend/src/app/core/services/session.service.ts` | Angular session state, REST calls, WebSocket subscription |
| `frontend/src/app/features/control-panel/control-panel.component.ts` | Start/Pause/Resume/Stop/Reset UI |

---

## Python JSON-Lines protocol

All messages are newline-delimited JSON objects on stdout.

| `type` | Direction | Description |
|--------|-----------|-------------|
| `init_ack` | Python → Node | Emitted on startup; includes `session_id` and `device` (cpu/cuda/mps) |
| `status` | Python → Node | Status change: `{ status: "training" \| "paused" \| "stopped" }` |
| `episode_end` | Python → Node | Per-episode metrics: `episode`, `reward`, `avg_reward`, `best_reward`, `steps`, `loss`, plus algorithm-specific metrics |
| `frame` | Python → Node | Base64-encoded RGB frame: `{ episode, step, frame }` |
| `training_complete` | Python → Node | Final summary: `total_episodes`, `best_reward` |
| `error` | Python → Node | `{ message, fatal }` — fatal errors exit the process |
| `pause` / `resume` / `stop` | Node → Python | Control commands written to stdin |

---

## Algorithms

Each algorithm lives in `python/algorithms/<algo>/agent.py` and extends `BaseAgent`.

| ID | Class | Notes |
|----|-------|-------|
| `dqn` | `DQNAgent` | Experience replay + target network |
| `ppo` | `PPOAgent` | Clipped surrogate objective, GAE |
| `reinforce` | `REINFORCEAgent` | Monte Carlo policy gradient |
| `q_learning` | `QLearningAgent` | Tabular, requires state discretization (`n_bins`) |

### Adding a new algorithm

1. Create `python/algorithms/<algo>/agent.py` implementing `BaseAgent`.
2. Add a `case` in `python/training/trainer.py → create_agent()`.
3. Add metadata + hyperparameter schema to `backend/src/routes/meta.route.ts`.

---

## Environments

| ID | Display name | Difficulty | Requires Box2D |
|----|-------------|------------|----------------|
| `CartPole-v1` | Cart Pole | easy | no |
| `MountainCar-v0` | Mountain Car | medium | no |
| `Acrobot-v1` | Acrobot | medium | no |
| `LunarLander-v3` | Lunar Lander | hard | yes |

Q-Learning only works on `MountainCar-v0` and `Acrobot-v1` (discrete-action + low-dimensional obs).

### Adding a new environment

1. Add an entry to `python/environments/registry.py`.
2. Add the same entry to the `ENVIRONMENTS` array in `backend/src/routes/meta.route.ts`.

---

## Session lifecycle

```
created → training → paused ↔ training → complete
                           └──────────────→ stopped
                                         → error
```

Max 3 concurrent active sessions (`MAX_CONCURRENT_SESSIONS` in `session-manager.service.ts`).

On stop: Node sends `{ type: "stop" }` to Python stdin, then force-kills after a 5 s grace period.

---

## Python environment

The backend auto-detects the Python executable in this order:
1. `PYTHON_EXECUTABLE` env var
2. `.venv/Scripts/python.exe` (Windows) / `.venv/bin/python` (Unix)
3. `venv/Scripts/python.exe` / `venv/bin/python`
4. `python` / `python3` on PATH

Always activate the venv before running `npm run dev` to ensure the correct Python is used, or set `PYTHON_EXECUTABLE` explicitly.
