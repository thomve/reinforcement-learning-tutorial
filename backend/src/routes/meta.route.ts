import { Router, Request, Response } from 'express';

const ENVIRONMENTS = [
  {
    id: 'CartPole-v1',
    displayName: 'Cart Pole',
    description: 'Balance a pole on a moving cart. Classic control problem — great first environment.',
    difficulty: 'easy',
    obsSpaceDim: 4,
    actionSpaceSize: 2,
    solvedThreshold: 475,
    compatibleAlgorithms: ['dqn', 'ppo', 'reinforce'],
    requiresBox2d: false,
  },
  {
    id: 'MountainCar-v0',
    displayName: 'Mountain Car',
    description: 'Drive an underpowered car up a hill. Sparse reward — a great exploration challenge.',
    difficulty: 'medium',
    obsSpaceDim: 2,
    actionSpaceSize: 3,
    solvedThreshold: -110,
    compatibleAlgorithms: ['dqn', 'ppo', 'reinforce', 'q_learning'],
    requiresBox2d: false,
  },
  {
    id: 'Acrobot-v1',
    displayName: 'Acrobot',
    description: 'Swing a two-link robot arm above a threshold. Underactuated control.',
    difficulty: 'medium',
    obsSpaceDim: 6,
    actionSpaceSize: 3,
    solvedThreshold: -100,
    compatibleAlgorithms: ['dqn', 'ppo', 'reinforce', 'q_learning'],
    requiresBox2d: false,
  },
  {
    id: 'LunarLander-v3',
    displayName: 'Lunar Lander',
    description: 'Land a spacecraft on the moon. Visually impressive — requires Box2D.',
    difficulty: 'hard',
    obsSpaceDim: 8,
    actionSpaceSize: 4,
    solvedThreshold: 200,
    compatibleAlgorithms: ['dqn', 'ppo', 'reinforce'],
    requiresBox2d: true,
  },
];

const ALGORITHMS = [
  {
    id: 'dqn',
    displayName: 'Deep Q-Network (DQN)',
    description:
      'Uses a neural network to approximate Q-values. Includes experience replay and a target network for stability.',
    hyperparameters: [
      { key: 'hidden_layers', label: 'Hidden Layers', type: 'layers', default: [64, 64] },
      { key: 'activation', label: 'Activation', type: 'select', options: ['relu', 'tanh', 'sigmoid'], default: 'relu' },
      { key: 'learning_rate', label: 'Learning Rate', type: 'float', default: 0.001, min: 0.000001, max: 0.1, step: 0.0001 },
      { key: 'discount_factor', label: 'Discount (γ)', type: 'float', default: 0.99, min: 0.8, max: 1.0, step: 0.001 },
      { key: 'batch_size', label: 'Batch Size', type: 'integer', default: 64, min: 8, max: 512 },
      { key: 'epsilon_start', label: 'ε Start', type: 'float', default: 1.0, min: 0.1, max: 1.0, step: 0.01 },
      { key: 'epsilon_end', label: 'ε End', type: 'float', default: 0.01, min: 0.001, max: 0.5, step: 0.001 },
      { key: 'epsilon_decay', label: 'ε Decay', type: 'float', default: 0.995, min: 0.9, max: 0.9999, step: 0.0001 },
      { key: 'buffer_size', label: 'Replay Buffer Size', type: 'integer', default: 10000, min: 1000, max: 100000 },
      { key: 'target_update_freq', label: 'Target Net Update (steps)', type: 'integer', default: 100, min: 1, max: 10000 },
    ],
  },
  {
    id: 'ppo',
    displayName: 'Proximal Policy Optimization (PPO)',
    description:
      'A state-of-the-art policy gradient method. Clips the policy update ratio to prevent destructively large updates.',
    hyperparameters: [
      { key: 'hidden_layers', label: 'Hidden Layers', type: 'layers', default: [64, 64] },
      { key: 'activation', label: 'Activation', type: 'select', options: ['relu', 'tanh', 'sigmoid'], default: 'tanh' },
      { key: 'learning_rate', label: 'Learning Rate', type: 'float', default: 0.0003, min: 0.000001, max: 0.01, step: 0.00001 },
      { key: 'discount_factor', label: 'Discount (γ)', type: 'float', default: 0.99, min: 0.8, max: 1.0, step: 0.001 },
      { key: 'batch_size', label: 'Mini-Batch Size', type: 'integer', default: 64, min: 16, max: 512 },
      { key: 'n_steps', label: 'Steps per Update', type: 'integer', default: 2048, min: 64, max: 16384 },
      { key: 'n_epochs', label: 'Epochs per Update', type: 'integer', default: 10, min: 1, max: 50 },
      { key: 'clip_epsilon', label: 'Clip ε', type: 'float', default: 0.2, min: 0.01, max: 0.5, step: 0.01 },
      { key: 'entropy_coeff', label: 'Entropy Coeff', type: 'float', default: 0.01, min: 0, max: 0.1, step: 0.001 },
      { key: 'value_coeff', label: 'Value Coeff', type: 'float', default: 0.5, min: 0.1, max: 1.0, step: 0.1 },
    ],
  },
  {
    id: 'reinforce',
    displayName: 'REINFORCE (Policy Gradient)',
    description:
      'The original policy gradient algorithm. Simple and intuitive — updates the policy using Monte Carlo returns.',
    hyperparameters: [
      { key: 'hidden_layers', label: 'Hidden Layers', type: 'layers', default: [64, 64] },
      { key: 'activation', label: 'Activation', type: 'select', options: ['relu', 'tanh', 'sigmoid'], default: 'relu' },
      { key: 'learning_rate', label: 'Learning Rate', type: 'float', default: 0.001, min: 0.000001, max: 0.1, step: 0.0001 },
      { key: 'discount_factor', label: 'Discount (γ)', type: 'float', default: 0.99, min: 0.8, max: 1.0, step: 0.001 },
    ],
  },
  {
    id: 'q_learning',
    displayName: 'Q-Learning (Tabular)',
    description:
      'Classic tabular Q-Learning with state discretization. Works for simple environments — great for understanding the fundamentals.',
    hyperparameters: [
      { key: 'learning_rate', label: 'Learning Rate (α)', type: 'float', default: 0.1, min: 0.001, max: 1.0, step: 0.01 },
      { key: 'discount_factor', label: 'Discount (γ)', type: 'float', default: 0.99, min: 0.8, max: 1.0, step: 0.001 },
      { key: 'epsilon_start', label: 'ε Start', type: 'float', default: 1.0, min: 0.1, max: 1.0, step: 0.01 },
      { key: 'epsilon_end', label: 'ε End', type: 'float', default: 0.01, min: 0.001, max: 0.5, step: 0.001 },
      { key: 'epsilon_decay', label: 'ε Decay', type: 'float', default: 0.995, min: 0.9, max: 0.9999, step: 0.0001 },
      { key: 'n_bins', label: 'Discretization Bins', type: 'integer', default: 10, min: 3, max: 30 },
    ],
  },
];

export function createMetaRouter(): Router {
  const router = Router();

  router.get('/environments', (_req: Request, res: Response) => {
    res.json(ENVIRONMENTS);
  });

  router.get('/algorithms', (_req: Request, res: Response) => {
    res.json(ALGORITHMS);
  });

  return router;
}
