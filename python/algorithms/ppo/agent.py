from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

from algorithms.base_agent import BaseAgent
from algorithms.ppo.network import ActorCriticNetwork


class PPORolloutBuffer:
    def __init__(self):
        self.states: List[np.ndarray] = []
        self.actions: List[int] = []
        self.rewards: List[float] = []
        self.log_probs: List[float] = []
        self.values: List[float] = []
        self.dones: List[bool] = []

    def clear(self):
        self.states.clear()
        self.actions.clear()
        self.rewards.clear()
        self.log_probs.clear()
        self.values.clear()
        self.dones.clear()

    def __len__(self):
        return len(self.states)


class PPOAgent(BaseAgent):
    def __init__(self, obs_dim: int, n_actions: int, config: Dict[str, Any], device: str):
        super().__init__(obs_dim, n_actions, config, device)
        self.dev = torch.device(device)

        hidden = config.get("hidden_layers", [64, 64])
        activation = config.get("activation", "tanh")

        self.network = ActorCriticNetwork(obs_dim, n_actions, hidden, activation).to(self.dev)
        self.optimizer = optim.Adam(
            self.network.parameters(), lr=config.get("learning_rate", 3e-4)
        )

        self.gamma = config.get("discount_factor", 0.99)
        self.gae_lambda = 0.95
        self.clip_epsilon = config.get("clip_epsilon", 0.2)
        self.entropy_coeff = config.get("entropy_coeff", 0.01)
        self.value_coeff = config.get("value_coeff", 0.5)
        self.n_steps = config.get("n_steps", 2048)
        self.n_epochs = config.get("n_epochs", 10)
        self.batch_size = config.get("batch_size", 64)

        self.rollout = PPORolloutBuffer()
        self._last_loss: Optional[float] = None
        self._current_state: Optional[np.ndarray] = None
        self._current_log_prob: Optional[float] = None
        self._current_value: Optional[float] = None

    def select_action(self, state: np.ndarray, training: bool = True) -> int:
        with torch.no_grad():
            s = torch.FloatTensor(state).unsqueeze(0).to(self.dev)
            action, log_prob, _, value = self.network.get_action_and_value(s)

        self._current_state = state
        self._current_log_prob = float(log_prob.item())
        self._current_value = float(value.item())
        return int(action.item())

    def store_transition(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        next_state: np.ndarray,
        done: bool,
    ) -> None:
        self.rollout.states.append(state)
        self.rollout.actions.append(action)
        self.rollout.rewards.append(reward)
        self.rollout.log_probs.append(self._current_log_prob or 0.0)
        self.rollout.values.append(self._current_value or 0.0)
        self.rollout.dones.append(done)

    def train_step(self) -> Optional[float]:
        if len(self.rollout) < self.n_steps:
            return self._last_loss

        return self._update()

    def _compute_gae(self, rewards, values, dones, last_value: float):
        advantages = np.zeros(len(rewards), dtype=np.float32)
        last_gae = 0.0
        for t in reversed(range(len(rewards))):
            next_val = last_value if t == len(rewards) - 1 else values[t + 1]
            next_non_terminal = 1.0 - float(dones[t])
            delta = rewards[t] + self.gamma * next_val * next_non_terminal - values[t]
            last_gae = delta + self.gamma * self.gae_lambda * next_non_terminal * last_gae
            advantages[t] = last_gae
        returns = advantages + np.array(values, dtype=np.float32)
        return advantages, returns

    def _update(self) -> float:
        states = np.array(self.rollout.states, dtype=np.float32)
        actions = np.array(self.rollout.actions, dtype=np.int64)
        old_log_probs = np.array(self.rollout.log_probs, dtype=np.float32)
        rewards = self.rollout.rewards
        values = self.rollout.values
        dones = self.rollout.dones

        advantages, returns = self._compute_gae(rewards, values, dones, last_value=0.0)
        advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)

        states_t = torch.FloatTensor(states).to(self.dev)
        actions_t = torch.LongTensor(actions).to(self.dev)
        old_log_probs_t = torch.FloatTensor(old_log_probs).to(self.dev)
        advantages_t = torch.FloatTensor(advantages).to(self.dev)
        returns_t = torch.FloatTensor(returns).to(self.dev)

        total_loss = 0.0
        n = len(states)
        for _ in range(self.n_epochs):
            indices = np.random.permutation(n)
            for start in range(0, n, self.batch_size):
                idx = indices[start : start + self.batch_size]
                _, new_log_probs, entropy, new_values = self.network.get_action_and_value(
                    states_t[idx], actions_t[idx]
                )

                ratio = torch.exp(new_log_probs - old_log_probs_t[idx])
                adv = advantages_t[idx]

                policy_loss = -torch.min(
                    ratio * adv,
                    torch.clamp(ratio, 1 - self.clip_epsilon, 1 + self.clip_epsilon) * adv,
                ).mean()

                value_loss = nn.MSELoss()(new_values, returns_t[idx])
                entropy_loss = -entropy.mean()

                loss = (
                    policy_loss
                    + self.value_coeff * value_loss
                    + self.entropy_coeff * entropy_loss
                )

                self.optimizer.zero_grad()
                loss.backward()
                nn.utils.clip_grad_norm_(self.network.parameters(), 0.5)
                self.optimizer.step()
                total_loss += float(loss.item())

        self.rollout.clear()
        n_updates = self.n_epochs * max(1, n // self.batch_size)
        self._last_loss = total_loss / n_updates
        return self._last_loss

    def episode_end(self, episode: int) -> None:
        pass  # PPO doesn't use epsilon

    def get_metrics(self) -> Dict[str, Any]:
        return {}
