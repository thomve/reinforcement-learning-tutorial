import sys
import time
import threading
from typing import Any, Dict, Optional

import gymnasium as gym
import numpy as np

from algorithms.base_agent import BaseAgent
from utils.frame_encoder import encode_frame
from utils.config_schema import SessionConfig


def emit(msg: Dict[str, Any]) -> None:
    """Emit a JSON-Lines message to stdout (flushed immediately)."""
    import json
    print(json.dumps(msg), flush=True)


def create_agent(config: SessionConfig, obs_dim: int, n_actions: int, device: str, env) -> BaseAgent:
    algo = config.algorithm
    nn_cfg = config.nn_config.model_dump()

    if algo == "dqn":
        from algorithms.dqn.agent import DQNAgent
        return DQNAgent(obs_dim, n_actions, nn_cfg, device)
    elif algo == "ppo":
        from algorithms.ppo.agent import PPOAgent
        return PPOAgent(obs_dim, n_actions, nn_cfg, device)
    elif algo == "reinforce":
        from algorithms.reinforce.agent import REINFORCEAgent
        return REINFORCEAgent(obs_dim, n_actions, nn_cfg, device)
    elif algo == "q_learning":
        from algorithms.q_learning.agent import QLearningAgent
        obs_low = env.observation_space.low if hasattr(env.observation_space, 'low') else None
        obs_high = env.observation_space.high if hasattr(env.observation_space, 'high') else None
        return QLearningAgent(obs_dim, n_actions, nn_cfg, device, obs_low, obs_high)
    else:
        raise ValueError(f"Unknown algorithm: {algo}")


class Trainer:
    def __init__(self, config: SessionConfig, device: str):
        self.config = config
        self.device = device
        self._pause_event = threading.Event()
        self._pause_event.set()  # Not paused initially
        self._stop_flag = False
        self._control_thread = threading.Thread(target=self._read_control, daemon=True)

    def _read_control(self):
        """Read control commands from stdin in a background thread."""
        import json
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                cmd = json.loads(line)
                t = cmd.get("type", "")
                if t == "pause":
                    self._pause_event.clear()
                    emit({"type": "status", "status": "paused"})
                elif t == "resume":
                    self._pause_event.set()
                    emit({"type": "status", "status": "training"})
                elif t == "stop":
                    self._stop_flag = True
                    self._pause_event.set()  # Unblock if paused
            except Exception:
                pass

    def run(self):
        cfg = self.config
        training_cfg = cfg.training
        env_id = cfg.env

        # Create env with rgb_array render mode for frame capture
        env = gym.make(env_id, render_mode="rgb_array")
        obs_dim = int(np.prod(env.observation_space.shape))
        n_actions = env.action_space.n

        agent = create_agent(cfg, obs_dim, n_actions, self.device, env)
        self._control_thread.start()

        best_reward = float("-inf")
        recent_rewards = []
        total_steps = 0

        emit({"type": "status", "status": "training"})

        for episode in range(1, training_cfg.max_episodes + 1):
            if self._stop_flag:
                break

            self._pause_event.wait()  # Block if paused

            state, _ = env.reset()
            episode_reward = 0.0
            episode_loss = 0.0
            loss_count = 0
            step_count = 0

            for step in range(training_cfg.max_steps_per_episode):
                if self._stop_flag:
                    break

                action = agent.select_action(state, training=True)
                next_state, reward, terminated, truncated, _ = env.step(action)
                done = terminated or truncated

                agent.store_transition(state, action, reward, next_state, done)
                loss = agent.train_step()
                if loss is not None:
                    episode_loss += loss
                    loss_count += 1

                # Emit frame (throttled)
                if (
                    training_cfg.render
                    and total_steps % training_cfg.render_every_n_steps == 0
                ):
                    try:
                        frame_array = env.render()
                        if frame_array is not None:
                            frame_b64 = encode_frame(frame_array)
                            emit({
                                "type": "frame",
                                "episode": episode,
                                "step": step,
                                "frame": frame_b64,
                            })
                    except Exception:
                        pass

                episode_reward += reward
                state = next_state
                step_count += 1
                total_steps += 1

                if done:
                    break

            agent.episode_end(episode)

            avg_loss = episode_loss / max(1, loss_count)
            best_reward = max(best_reward, episode_reward)
            recent_rewards.append(episode_reward)
            if len(recent_rewards) > 100:
                recent_rewards.pop(0)
            avg_reward = sum(recent_rewards) / len(recent_rewards)

            metrics = agent.get_metrics()
            emit({
                "type": "episode_end",
                "episode": episode,
                "reward": round(episode_reward, 2),
                "avg_reward": round(avg_reward, 2),
                "best_reward": round(best_reward, 2),
                "steps": step_count,
                "loss": round(avg_loss, 6) if avg_loss else None,
                "timestamp": time.time(),
                **metrics,
            })

        env.close()
        emit({
            "type": "training_complete",
            "total_episodes": episode,
            "best_reward": round(best_reward, 2),
        })
