from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Tuple
import numpy as np


class BaseAgent(ABC):
    """Abstract base class for all RL agents."""

    def __init__(self, obs_dim: int, n_actions: int, config: Dict[str, Any], device: str):
        self.obs_dim = obs_dim
        self.n_actions = n_actions
        self.config = config
        self.device = device

    @abstractmethod
    def select_action(self, state: np.ndarray, training: bool = True) -> int:
        """Select an action given the current state."""
        ...

    @abstractmethod
    def store_transition(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        next_state: np.ndarray,
        done: bool,
    ) -> None:
        """Store a transition in the agent's memory."""
        ...

    @abstractmethod
    def train_step(self) -> Optional[float]:
        """
        Perform one training step.
        Returns loss value if a gradient update was made, else None.
        """
        ...

    @abstractmethod
    def episode_end(self, episode: int) -> None:
        """Called at the end of each episode for bookkeeping (e.g. epsilon decay)."""
        ...

    def get_metrics(self) -> Dict[str, Any]:
        """Return algorithm-specific metrics for display (e.g. epsilon, lr)."""
        return {}
