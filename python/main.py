"""
Reinforcement Learning Tutorial — Python RL Engine entry point.

Communication protocol:
  - Reads a single JSON config line from stdin on startup.
  - Emits JSON-Lines to stdout during training.
  - Reads control commands (pause/resume/stop) from stdin mid-training.

Usage:
  python main.py   # then write JSON config to stdin
"""
import sys
import json
import traceback

# CRITICAL: enable line-buffered stdout so Node.js receives events in real time
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)


def emit(msg: dict) -> None:
    print(json.dumps(msg), flush=True)


def detect_device() -> str:
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
    except ImportError:
        pass
    return "cpu"


def main():
    # Read the initial config from stdin (first line only)
    raw = sys.stdin.readline().strip()
    if not raw:
        emit({"type": "error", "message": "No config received on stdin", "fatal": True})
        sys.exit(1)

    try:
        config_dict = json.loads(raw)
    except json.JSONDecodeError as e:
        emit({"type": "error", "message": f"Invalid JSON config: {e}", "fatal": True})
        sys.exit(1)

    try:
        from utils.config_schema import SessionConfig
        config = SessionConfig(**config_dict)
    except Exception as e:
        emit({"type": "error", "message": f"Config validation error: {e}", "fatal": True})
        sys.exit(1)

    device = detect_device()
    emit({"type": "init_ack", "session_id": config.session_id, "device": device})

    try:
        from training.trainer import Trainer
        trainer = Trainer(config, device)
        trainer.run()
    except Exception as e:
        emit({
            "type": "error",
            "message": str(e),
            "traceback": traceback.format_exc(),
            "fatal": True,
        })
        sys.exit(1)


if __name__ == "__main__":
    main()
