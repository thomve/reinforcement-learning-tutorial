from typing import Any, Dict, List, Optional

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

from algorithms.base_agent import BaseAgent
from algorithms.dqn.network import build_mlp


class PolicyNetwork(nn.Module):
    def __init__(self, obs_dim: int, n_actions: int, hidden_layers: List[int], activation: str):
        super().__init__()
        self.net = build_mlp(obs_dim, n_actions, hidden_layers, activation)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return torch.softmax(self.net(x), dim=-1)


class REINFORCEAgent(BaseAgent):
    """Monte Carlo Policy Gradient (REINFORCE) agent."""

    def __init__(self, obs_dim: int, n_actions: int, config: Dict[str, Any], device: str):
        super().__init__(obs_dim, n_actions, config, device)
        self.dev = torch.device(device)

        hidden = config.get("hidden_layers", [64, 64])
        activation = config.get("activation", "relu")

        self.policy = PolicyNetwork(obs_dim, n_actions, hidden, activation).to(self.dev)
        self.optimizer = optim.Adam(
            self.policy.parameters(), lr=config.get("learning_rate", 1e-3)
        )
        self.gamma = config.get("discount_factor", 0.99)

        self._log_probs: List[torch.Tensor] = []
        self._rewards: List[float] = []
        self._last_loss: Optional[float] = None

    def select_action(self, state: np.ndarray, training: bool = True) -> int:
        s = torch.FloatTensor(state).unsqueeze(0).to(self.dev)
        probs = self.policy(s)
        dist = torch.distributions.Categorical(probs)
        action = dist.sample()
        if training:
            self._log_probs.append(dist.log_prob(action))
        return int(action.item())

    def store_transition(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        next_state: np.ndarray,
        done: bool,
    ) -> None:
        self._rewards.append(reward)

    def train_step(self) -> Optional[float]:
        # REINFORCE updates at episode end, not per step
        return self._last_loss

    def episode_end(self, episode: int) -> None:
        if not self._log_probs:
            return

        # Compute discounted returns
        returns = []
        G = 0.0
        for r in reversed(self._rewards):
            G = r + self.gamma * G
            returns.insert(0, G)

        returns_t = torch.FloatTensor(returns).to(self.dev)
        # Normalize for stability
        if len(returns_t) > 1:
            returns_t = (returns_t - returns_t.mean()) / (returns_t.std() + 1e-8)

        log_probs_t = torch.stack(self._log_probs)
        loss = -(log_probs_t * returns_t).mean()

        self.optimizer.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(self.policy.parameters(), 10.0)
        self.optimizer.step()

        self._last_loss = float(loss.item())
        self._log_probs.clear()
        self._rewards.clear()

    def get_metrics(self) -> Dict[str, Any]:
        return {}
