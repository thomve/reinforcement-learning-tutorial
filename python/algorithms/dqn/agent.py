import random
from typing import Any, Dict, Optional

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

from algorithms.base_agent import BaseAgent
from algorithms.dqn.network import QNetwork
from algorithms.dqn.replay_buffer import ReplayBuffer


class DQNAgent(BaseAgent):
    def __init__(self, obs_dim: int, n_actions: int, config: Dict[str, Any], device: str):
        super().__init__(obs_dim, n_actions, config, device)
        self.dev = torch.device(device)

        hidden = config.get("hidden_layers", [64, 64])
        activation = config.get("activation", "relu")

        self.q_net = QNetwork(obs_dim, n_actions, hidden, activation).to(self.dev)
        self.target_net = QNetwork(obs_dim, n_actions, hidden, activation).to(self.dev)
        self.target_net.load_state_dict(self.q_net.state_dict())
        self.target_net.eval()

        self.optimizer = optim.Adam(
            self.q_net.parameters(), lr=config.get("learning_rate", 1e-3)
        )
        self.replay_buffer = ReplayBuffer(config.get("buffer_size", 10000))

        self.gamma = config.get("discount_factor", 0.99)
        self.batch_size = config.get("batch_size", 64)
        self.epsilon = config.get("epsilon_start", 1.0)
        self.epsilon_end = config.get("epsilon_end", 0.01)
        self.epsilon_decay = config.get("epsilon_decay", 0.995)
        self.target_update_freq = config.get("target_update_freq", 100)
        self._step_count = 0

    def select_action(self, state: np.ndarray, training: bool = True) -> int:
        if training and random.random() < self.epsilon:
            return random.randint(0, self.n_actions - 1)
        with torch.no_grad():
            s = torch.FloatTensor(state).unsqueeze(0).to(self.dev)
            q_values = self.q_net(s)
            return int(q_values.argmax(dim=1).item())

    def store_transition(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        next_state: np.ndarray,
        done: bool,
    ) -> None:
        self.replay_buffer.push(state, action, reward, next_state, done)

    def train_step(self) -> Optional[float]:
        if len(self.replay_buffer) < self.batch_size:
            return None

        states, actions, rewards, next_states, dones = self.replay_buffer.sample(
            self.batch_size
        )

        states_t = torch.FloatTensor(states).to(self.dev)
        actions_t = torch.LongTensor(actions).to(self.dev)
        rewards_t = torch.FloatTensor(rewards).to(self.dev)
        next_states_t = torch.FloatTensor(next_states).to(self.dev)
        dones_t = torch.FloatTensor(dones).to(self.dev)

        # Current Q values
        q_values = self.q_net(states_t).gather(1, actions_t.unsqueeze(1)).squeeze(1)

        # Target Q values (Bellman equation)
        with torch.no_grad():
            next_q = self.target_net(next_states_t).max(1)[0]
            targets = rewards_t + self.gamma * next_q * (1 - dones_t)

        loss = nn.SmoothL1Loss()(q_values, targets)
        self.optimizer.zero_grad()
        loss.backward()
        # Gradient clipping for stability
        nn.utils.clip_grad_norm_(self.q_net.parameters(), 10.0)
        self.optimizer.step()

        self._step_count += 1
        if self._step_count % self.target_update_freq == 0:
            self.target_net.load_state_dict(self.q_net.state_dict())

        return float(loss.item())

    def episode_end(self, episode: int) -> None:
        self.epsilon = max(self.epsilon_end, self.epsilon * self.epsilon_decay)

    def get_metrics(self) -> Dict[str, Any]:
        return {"epsilon": round(self.epsilon, 4)}
