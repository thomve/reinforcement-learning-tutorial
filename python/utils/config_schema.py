from pydantic import BaseModel, Field
from typing import List, Literal, Optional


class NNConfig(BaseModel):
    hidden_layers: List[int] = Field(default=[64, 64])
    activation: Literal["relu", "tanh", "sigmoid"] = "relu"
    learning_rate: float = Field(default=0.001, ge=1e-6, le=1.0)
    discount_factor: float = Field(default=0.99, ge=0.0, le=1.0)
    batch_size: int = Field(default=64, ge=8, le=512)
    # DQN-specific
    epsilon_start: float = Field(default=1.0, ge=0.0, le=1.0)
    epsilon_end: float = Field(default=0.01, ge=0.0, le=1.0)
    epsilon_decay: float = Field(default=0.995, ge=0.8, le=0.9999)
    buffer_size: int = Field(default=10000, ge=100, le=200000)
    target_update_freq: int = Field(default=100, ge=1, le=10000)
    # PPO-specific
    clip_epsilon: float = Field(default=0.2, ge=0.01, le=0.5)
    entropy_coeff: float = Field(default=0.01, ge=0.0, le=0.1)
    value_coeff: float = Field(default=0.5, ge=0.1, le=1.0)
    n_steps: int = Field(default=2048, ge=64, le=16384)
    n_epochs: int = Field(default=10, ge=1, le=50)
    # Q-Learning specific
    n_bins: int = Field(default=10, ge=3, le=30)


class TrainingConfig(BaseModel):
    max_episodes: int = Field(default=500, ge=1, le=5000)
    render_every_n_steps: int = Field(default=10, ge=1, le=100)
    render: bool = True
    max_steps_per_episode: int = Field(default=1000, ge=10, le=10000)


class SessionConfig(BaseModel):
    type: Literal["init"] = "init"
    session_id: str
    env: str = "CartPole-v1"
    algorithm: Literal["dqn", "ppo", "reinforce", "q_learning"] = "dqn"
    nn_config: NNConfig = Field(default_factory=NNConfig)
    training: TrainingConfig = Field(default_factory=TrainingConfig)
