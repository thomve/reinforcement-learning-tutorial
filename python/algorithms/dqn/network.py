import torch
import torch.nn as nn
from typing import List


ACTIVATIONS = {
    "relu": nn.ReLU,
    "tanh": nn.Tanh,
    "sigmoid": nn.Sigmoid,
}


def build_mlp(
    input_dim: int,
    output_dim: int,
    hidden_layers: List[int],
    activation: str = "relu",
) -> nn.Sequential:
    act_cls = ACTIVATIONS.get(activation, nn.ReLU)
    layers: list = []
    in_dim = input_dim
    for h in hidden_layers:
        layers.append(nn.Linear(in_dim, h))
        layers.append(act_cls())
        in_dim = h
    layers.append(nn.Linear(in_dim, output_dim))
    return nn.Sequential(*layers)


class QNetwork(nn.Module):
    def __init__(
        self,
        obs_dim: int,
        n_actions: int,
        hidden_layers: List[int],
        activation: str = "relu",
    ):
        super().__init__()
        self.net = build_mlp(obs_dim, n_actions, hidden_layers, activation)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)
