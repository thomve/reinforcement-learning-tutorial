# Reinforcement Learning Tutorial

An interactive full-stack application to explore reinforcement learning algorithms through a live UI.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 18 (standalone components, signals) + Chart.js |
| Backend | Node.js + Express + WebSocket (`ws`) |
| RL Engine | Python + PyTorch + Gymnasium |

## Features

- **4 environments**: CartPole, MountainCar, Acrobot, LunarLander
- **4 algorithms**: DQN, PPO, REINFORCE, Q-Learning (tabular)
- **Live charts**: per-episode reward & loss curves
- **Live game preview**: rendered frames streamed over WebSocket
- **Fully configurable**: neural network architecture, all hyperparameters, training settings
- **Pause / Resume / Stop** control mid-training

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| Python | ≥ 3.10 |
| pip | latest |
| Angular CLI | v18 (`npm install -g @angular/cli`) |

For **LunarLander**, you also need the Box2D bindings:

```bash
pip install gymnasium[box2d]
# On Windows you may also need: pip install swig
```

---

## Setup

### 1. Python environment

```bash
# From repo root
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r python/requirements.txt
```

### 2. Node.js dependencies

```bash
npm install
```

This installs both `backend/` and `frontend/` workspaces via npm workspaces.

---

## Development

Run backend and frontend in parallel:

```bash
npm run dev
```

- Angular dev server: http://localhost:4200 (proxies `/api` → Node.js)
- Node.js HTTP API: http://localhost:3000
- WebSocket server: ws://localhost:3001

> The Angular proxy (`frontend/proxy.conf.json`) forwards `/api` calls to the backend.
> WebSocket connects directly to port 3001.

### Run separately

```bash
npm run dev:backend    # Node.js only
npm run dev:frontend   # Angular only
```

---

## Production build

```bash
npm run build
```

The Angular build outputs to `frontend/dist/frontend/browser/`.  
The Node.js backend serves it as static files on port 3000.

```bash
node backend/dist/index.js
```

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP API port |
| `WS_PORT` | `3001` | WebSocket port |
| `PYTHON_EXECUTABLE` | auto-detected | Path to Python binary |

Create a `.env` file or set them in your shell.

---

## Project structure

```
reinforcement-learning-tutorial/
├── python/                 # RL engine
│   ├── main.py             # Entry point (reads JSON config from stdin)
│   ├── algorithms/
│   │   ├── dqn/            # Deep Q-Network
│   │   ├── ppo/            # Proximal Policy Optimization
│   │   ├── reinforce/      # REINFORCE (policy gradient)
│   │   └── q_learning/     # Tabular Q-Learning
│   ├── environments/       # Gymnasium env registry & metadata
│   ├── training/           # Training loop
│   └── utils/              # Frame encoder, config schemas
├── backend/                # Node.js server
│   └── src/
│       ├── services/       # Session manager, Python process, WebSocket
│       └── routes/         # REST API routes
└── frontend/               # Angular app
    └── src/app/
        ├── core/           # Services, models
        └── features/       # UI components
```

---

## Communication flow

```
Angular (4200) ──REST──► Node.js (3000) ──spawn──► Python process
                │                            │
                │◄──WebSocket (3001)──────────┘
                │   (JSON-Lines relayed live)
```

Node.js spawns Python with the session config on stdin, then relays Python's
`JSON-Lines` stdout to the Angular frontend via WebSocket in real time.

---

## Adding a new algorithm

1. Create `python/algorithms/my_algo/agent.py` implementing `BaseAgent`
2. Add a `case` in `python/training/trainer.py → create_agent()`
3. Add the algorithm metadata + hyperparameter schema to `backend/src/routes/meta.route.ts`

## Adding a new environment

1. Add an entry to `python/environments/registry.py`
2. Add the same entry to the `ENVIRONMENTS` array in `backend/src/routes/meta.route.ts`
