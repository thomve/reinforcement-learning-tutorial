import torch
import torch.nn as nn
from typing import List, Tuple

from algorithms.dqn.network import build_mlp


class ActorCriticNetwork(nn.Module):
    """Shared-backbone actor-critic for PPO."""

    def __init__(
        self,
        obs_dim: int,
        n_actions: int,
        hidden_layers: List[int],
        activation: str = "relu",
    ):
        super().__init__()
        # Shared feature extractor
        self.shared = build_mlp(obs_dim, hidden_layers[-1], hidden_layers[:-1], activation)
        # Policy head (actor)
        self.actor = nn.Linear(hidden_layers[-1], n_actions)
        # Value head (critic)
        self.critic = nn.Linear(hidden_layers[-1], 1)

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        features = self.shared(x)
        logits = self.actor(features)
        value = self.critic(features).squeeze(-1)
        return logits, value

    def get_action_and_value(
        self, x: torch.Tensor, action: torch.Tensor = None
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        logits, value = self.forward(x)
        dist = torch.distributions.Categorical(logits=logits)
        if action is None:
            action = dist.sample()
        log_prob = dist.log_prob(action)
        entropy = dist.entropy()
        return action, log_prob, entropy, value
