export type AlgorithmId = 'dqn' | 'ppo' | 'reinforce' | 'q_learning';
export type SessionStatus = 'created' | 'training' | 'paused' | 'complete' | 'error' | 'stopped';
export type Activation = 'relu' | 'tanh' | 'sigmoid';

export interface NNConfig {
  hidden_layers: number[];
  activation: Activation;
  learning_rate: number;
  discount_factor: number;
  batch_size: number;
  epsilon_start?: number;
  epsilon_end?: number;
  epsilon_decay?: number;
  buffer_size?: number;
  target_update_freq?: number;
  clip_epsilon?: number;
  entropy_coeff?: number;
  value_coeff?: number;
  n_steps?: number;
  n_epochs?: number;
  n_bins?: number;
}

export interface TrainingConfig {
  max_episodes: number;
  render_every_n_steps: number;
  render: boolean;
  max_steps_per_episode: number;
}

export interface CreateSessionRequest {
  env: string;
  algorithm: AlgorithmId;
  nn_config: NNConfig;
  training: TrainingConfig;
}

export interface Session {
  id: string;
  config: CreateSessionRequest & { type: 'init'; session_id: string };
  status: SessionStatus;
  createdAt: number;
  device?: string;
  bestReward?: number;
  currentEpisode?: number;
  totalEpisodes?: number;
  errorMessage?: string;
}

export interface EnvironmentDef {
  id: string;
  displayName: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  obsSpaceDim: number;
  actionSpaceSize: number;
  solvedThreshold: number;
  compatibleAlgorithms: AlgorithmId[];
  requiresBox2d: boolean;
}

export interface HyperparamDef {
  key: string;
  label: string;
  type: 'float' | 'integer' | 'select' | 'layers';
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export interface AlgorithmDef {
  id: AlgorithmId;
  displayName: string;
  description: string;
  hyperparameters: HyperparamDef[];
}

export interface EpisodeMetric {
  episode: number;
  reward: number;
  avg_reward: number;
  best_reward: number;
  steps: number;
  loss: number | null;
  timestamp: number;
  epsilon?: number;
}
