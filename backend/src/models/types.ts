export type AlgorithmId = 'dqn' | 'ppo' | 'reinforce' | 'q_learning';
export type SessionStatus = 'created' | 'training' | 'paused' | 'complete' | 'error' | 'stopped';

export interface NNConfig {
  hidden_layers: number[];
  activation: 'relu' | 'tanh' | 'sigmoid';
  learning_rate: number;
  discount_factor: number;
  batch_size: number;
  // DQN
  epsilon_start?: number;
  epsilon_end?: number;
  epsilon_decay?: number;
  buffer_size?: number;
  target_update_freq?: number;
  // PPO
  clip_epsilon?: number;
  entropy_coeff?: number;
  value_coeff?: number;
  n_steps?: number;
  n_epochs?: number;
  // Q-Learning
  n_bins?: number;
}

export interface TrainingConfig {
  max_episodes: number;
  render_every_n_steps: number;
  render: boolean;
  max_steps_per_episode: number;
}

export interface SessionConfig {
  type: 'init';
  session_id: string;
  env: string;
  algorithm: AlgorithmId;
  nn_config: NNConfig;
  training: TrainingConfig;
}

export interface Session {
  id: string;
  config: SessionConfig;
  status: SessionStatus;
  createdAt: number;
  device?: string;
  bestReward?: number;
  currentEpisode?: number;
  totalEpisodes?: number;
  errorMessage?: string;
}

// Python stdout JSON-Lines message types
export interface PythonMessage {
  type: string;
  [key: string]: unknown;
}

// WebSocket message envelope
export interface WsMessage {
  type: string;
  sessionId?: string;
  payload?: unknown;
  [key: string]: unknown;
}
