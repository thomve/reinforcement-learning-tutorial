import random
from typing import Any, Dict, Optional, Tuple

import numpy as np

from algorithms.base_agent import BaseAgent


class QLearningAgent(BaseAgent):
    """
    Tabular Q-Learning with state discretization for continuous observation spaces.
    Works with environments with small observation dimensions.
    """

    def __init__(self, obs_dim: int, n_actions: int, config: Dict[str, Any], device: str,
                 obs_low: np.ndarray = None, obs_high: np.ndarray = None):
        super().__init__(obs_dim, n_actions, config, device)

        self.n_bins = config.get("n_bins", 10)
        self.gamma = config.get("discount_factor", 0.99)
        self.learning_rate = config.get("learning_rate", 0.1)
        self.epsilon = config.get("epsilon_start", 1.0)
        self.epsilon_end = config.get("epsilon_end", 0.01)
        self.epsilon_decay = config.get("epsilon_decay", 0.995)

        # Clip observation bounds to avoid infinite ranges
        if obs_low is None:
            obs_low = np.full(obs_dim, -10.0)
        if obs_high is None:
            obs_high = np.full(obs_dim, 10.0)

        self.obs_low = np.clip(obs_low, -10.0, 10.0)
        self.obs_high = np.clip(obs_high, -10.0, 10.0)

        # Q-table: [n_bins^obs_dim, n_actions] — flattened
        table_shape = tuple([self.n_bins] * obs_dim) + (n_actions,)
        self.q_table = np.zeros(table_shape, dtype=np.float32)
        self._last_loss: Optional[float] = None

    def _discretize(self, state: np.ndarray) -> Tuple[int, ...]:
        """Map continuous state to discrete bin indices."""
        clipped = np.clip(state, self.obs_low, self.obs_high)
        scaled = (clipped - self.obs_low) / (self.obs_high - self.obs_low + 1e-8)
        indices = np.floor(scaled * self.n_bins).astype(int)
        indices = np.clip(indices, 0, self.n_bins - 1)
        return tuple(indices.tolist())

    def select_action(self, state: np.ndarray, training: bool = True) -> int:
        if training and random.random() < self.epsilon:
            return random.randint(0, self.n_actions - 1)
        idx = self._discretize(state)
        return int(np.argmax(self.q_table[idx]))

    def store_transition(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        next_state: np.ndarray,
        done: bool,
    ) -> None:
        idx = self._discretize(state)
        next_idx = self._discretize(next_state)

        current_q = self.q_table[idx][action]
        next_max_q = 0.0 if done else float(np.max(self.q_table[next_idx]))
        target = reward + self.gamma * next_max_q
        td_error = target - current_q

        self.q_table[idx][action] += self.learning_rate * td_error
        self._last_loss = abs(td_error)

    def train_step(self) -> Optional[float]:
        return self._last_loss

    def episode_end(self, episode: int) -> None:
        self.epsilon = max(self.epsilon_end, self.epsilon * self.epsilon_decay)

    def get_metrics(self) -> Dict[str, Any]:
        return {"epsilon": round(self.epsilon, 4)}
