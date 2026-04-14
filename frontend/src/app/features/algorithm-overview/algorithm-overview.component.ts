import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface AlgorithmInfo {
  id: string;
  name: string;
  shortName: string;
  category: 'value-based' | 'policy-gradient' | 'actor-critic';
  tagline: string;
  description: string;
  howItWorks: string[];
  bestFor: string[];
  notIdealFor: string[];
  pros: string[];
  cons: string[];
  keyParams: { name: string; desc: string }[];
  complexity: 'low' | 'medium' | 'high';
  sampleEfficiency: 'low' | 'medium' | 'high';
  stability: 'low' | 'medium' | 'high';
}

const ALGORITHMS: AlgorithmInfo[] = [
  {
    id: 'dqn',
    name: 'Deep Q-Network',
    shortName: 'DQN',
    category: 'value-based',
    tagline: 'Value-based · Off-policy · Discrete actions',
    description:
      'DQN combines Q-Learning with deep neural networks. A network learns to approximate the Q-function Q(s,a) — the expected cumulative reward of taking action a in state s — allowing it to handle high-dimensional observation spaces like raw pixels.',
    howItWorks: [
      'Maintain a Q-network that maps (state, action) → expected return.',
      'Store transitions in a replay buffer and sample random mini-batches to break temporal correlations.',
      'Keep a separate target network whose weights are periodically copied from the main network to stabilise training.',
      'Explore with an ε-greedy policy that anneals ε from a high value to a small floor over training.',
      'Update the Q-network by minimising the Bellman error: (r + γ·max Q_target(s′,a′) − Q(s,a))².',
    ],
    bestFor: [
      'Discrete, finite action spaces (game controls, routing, scheduling)',
      'Environments with dense rewards and deterministic transitions',
      'Atari-style visual tasks when paired with convolutional encoders',
      'Off-policy reuse of experience (sample-efficient settings)',
    ],
    notIdealFor: [
      'Continuous action spaces (use PPO or SAC instead)',
      'Tasks requiring fine-grained stochastic policies',
      'Very sparse reward signals without reward shaping',
    ],
    pros: [
      'Sample-efficient thanks to experience replay',
      'Stable training with target network',
      'Widely studied — many proven extensions (Double DQN, Dueling, PER)',
      'Simple to implement and reason about',
    ],
    cons: [
      'Discrete actions only without architectural modifications',
      'Q-value over-estimation bias (mitigated by Double DQN)',
      'Replay buffer consumes significant memory',
      'Sensitive to reward scale and learning rate',
    ],
    keyParams: [
      { name: 'Learning rate (α)', desc: 'Step size for gradient descent on the Q-network.' },
      { name: 'Discount factor (γ)', desc: 'Weight given to future rewards vs immediate ones.' },
      { name: 'Replay buffer size', desc: 'Number of past transitions stored for mini-batch sampling.' },
      { name: 'ε start / end / decay', desc: 'Exploration schedule — how quickly to shift from random to greedy actions.' },
      { name: 'Target update freq.', desc: 'How often to copy weights from the main to the target network.' },
      { name: 'Batch size', desc: 'Number of transitions per gradient update.' },
    ],
    complexity: 'medium',
    sampleEfficiency: 'high',
    stability: 'medium',
  },
  {
    id: 'ppo',
    name: 'Proximal Policy Optimization',
    shortName: 'PPO',
    category: 'actor-critic',
    tagline: 'Actor-Critic · On-policy · Continuous & discrete',
    description:
      'PPO is a policy-gradient method that directly optimises the policy via an actor-critic architecture. It constrains each update so the new policy stays close to the old one using a clipped surrogate objective, achieving strong performance with surprisingly few hyperparameters.',
    howItWorks: [
      'Collect a batch of trajectories by running the current policy in the environment (on-policy data).',
      'Compute advantages using Generalised Advantage Estimation (GAE) to assess how much better each action was than average.',
      'Optimise the clipped surrogate objective: L = min(r·Â, clip(r, 1−ε, 1+ε)·Â), where r = π_new/π_old.',
      'Train a value function head (critic) to estimate state values, reducing variance.',
      'Add an entropy bonus to the loss to encourage continued exploration.',
      'Reuse the collected data for multiple gradient epochs before discarding it.',
    ],
    bestFor: [
      'Continuous control (robotics, locomotion, physics simulations)',
      'Large or complex discrete action spaces',
      'Tasks where stability and reproducibility matter',
      'Multi-agent environments',
      'Competitive benchmark tasks (MuJoCo, OpenAI Gym)',
    ],
    notIdealFor: [
      'Extremely sample-constrained settings (on-policy data is discarded after updates)',
      'Environments that are very expensive to simulate (off-policy methods reuse data better)',
    ],
    pros: [
      'Works out-of-the-box on continuous and discrete actions',
      'Stable and robust — hard to catastrophically diverge',
      'Simple clip mechanism replaces complex trust-region math (vs TRPO)',
      'Scales well with parallelised environment rollouts',
    ],
    cons: [
      'On-policy: each batch of experience is used only once',
      'Requires careful advantage normalisation',
      'Slower wall-clock convergence than off-policy methods on some tasks',
      'Clip ε and entropy coefficient add sensitivity',
    ],
    keyParams: [
      { name: 'Clip ε', desc: 'Limits how far the new policy can deviate from the old one per update.' },
      { name: 'Learning rate (α)', desc: 'Step size for both actor and critic networks.' },
      { name: 'Discount factor (γ)', desc: 'Time-horizon weighting for rewards.' },
      { name: 'n_steps', desc: 'Number of environment steps collected per rollout before an update.' },
      { name: 'n_epochs', desc: 'Number of gradient passes over each collected rollout batch.' },
      { name: 'Entropy coefficient', desc: 'Strength of the entropy bonus that encourages exploration.' },
      { name: 'Value coefficient', desc: 'Weight of the critic loss relative to the actor loss.' },
    ],
    complexity: 'medium',
    sampleEfficiency: 'medium',
    stability: 'high',
  },
  {
    id: 'reinforce',
    name: 'REINFORCE',
    shortName: 'REINFORCE',
    category: 'policy-gradient',
    tagline: 'Policy gradient · On-policy · Monte Carlo returns',
    description:
      'REINFORCE (Williams 1992) is the foundational policy-gradient algorithm. It directly parameterises the policy and nudges it towards actions that yielded higher-than-expected returns — no value function approximation required.',
    howItWorks: [
      'Parameterise the policy π_θ(a|s) as a neural network outputting action probabilities.',
      'Run a full episode to collect a complete trajectory τ = (s₀,a₀,r₀, …, s_T).',
      'Compute the discounted return Gₜ = Σ γᵏ rₜ₊ₖ from each time step.',
      'Update θ by ascending the gradient: ∇θ J ≈ Σₜ Gₜ · ∇θ log π_θ(aₜ|sₜ).',
      'Optionally subtract a baseline (e.g., average return) from Gₜ to reduce variance.',
    ],
    bestFor: [
      'Simple environments with dense rewards and short episodes',
      'Learning the policy-gradient fundamentals',
      'Discrete action tasks where a critic is unnecessary',
      'Research prototyping and ablations',
    ],
    notIdealFor: [
      'Long-horizon tasks (high variance Monte Carlo returns)',
      'Continuous control at scale',
      'Sample-constrained settings (extremely data-hungry)',
      'Environments with sparse rewards',
    ],
    pros: [
      'Conceptually simple — easy to implement from scratch',
      'Directly optimises the policy objective',
      'No replay buffer or target network needed',
      'Handles stochastic policies naturally',
    ],
    cons: [
      'Very high gradient variance → slow, noisy convergence',
      'Requires full episode before any update (Monte Carlo)',
      'Extremely sample-inefficient',
      'Sensitive to learning rate; can collapse to bad policies',
    ],
    keyParams: [
      { name: 'Learning rate (α)', desc: 'Step size for policy gradient ascent.' },
      { name: 'Discount factor (γ)', desc: 'Controls how much future rewards are weighted in Gₜ.' },
    ],
    complexity: 'low',
    sampleEfficiency: 'low',
    stability: 'low',
  },
  {
    id: 'q_learning',
    name: 'Q-Learning',
    shortName: 'Q-Learning',
    category: 'value-based',
    tagline: 'Tabular · Off-policy · Model-free · Classic',
    description:
      'Q-Learning (Watkins 1989) is the original model-free TD algorithm. It maintains a lookup table of Q-values indexed by (state, action) pairs and updates them incrementally using the Bellman equation — no neural network required.',
    howItWorks: [
      'Initialise a Q-table Q[s][a] for all state-action pairs (zeros or small random values).',
      'At each step, choose an action with an ε-greedy strategy.',
      'Observe the reward r and next state s′.',
      'Apply the Bellman update: Q[s][a] ← Q[s][a] + α(r + γ·max_a′ Q[s′][a′] − Q[s][a]).',
      'Repeat until Q-values converge to the optimal Q*.',
    ],
    bestFor: [
      'Small, discrete state and action spaces',
      'Gridworld navigation, maze solving, toy MDPs',
      'Teaching RL fundamentals — the algorithm is transparent',
      'Rapid prototyping when states are enumerable',
    ],
    notIdealFor: [
      'High-dimensional or continuous state spaces (table grows intractably)',
      'Environments with image or vector observations',
      'Production-scale RL tasks',
    ],
    pros: [
      'Guaranteed convergence to Q* under mild conditions',
      'No neural network — zero risk of function approximation instability',
      'Very low computational cost per update',
      'Crystal-clear, fully interpretable Q-table',
    ],
    cons: [
      'Does not scale beyond small discrete state spaces',
      'Q-table can be enormous or impossible for rich observations',
      'No generalisation across similar states',
      'Discrete actions only',
    ],
    keyParams: [
      { name: 'Learning rate (α)', desc: 'How aggressively Q-values are updated toward the target.' },
      { name: 'Discount factor (γ)', desc: 'Degree to which future rewards influence current Q-values.' },
      { name: 'ε start / end / decay', desc: 'Exploration schedule governing the ε-greedy action selection.' },
      { name: 'n_bins', desc: 'Number of bins used to discretise continuous observation dimensions into table indices.' },
    ],
    complexity: 'low',
    sampleEfficiency: 'medium',
    stability: 'high',
  },
];

@Component({
  selector: 'app-algorithm-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overview">
      <!-- Algorithm selector tabs -->
      <aside class="overview__sidebar">
        <div class="sidebar-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Algorithms</span>
        </div>

        @for (alg of algorithms; track alg.id) {
          <button
            class="sidebar-item"
            [class.sidebar-item--active]="selected().id === alg.id"
            (click)="select(alg)"
          >
            <span class="sidebar-item__short">{{ alg.shortName }}</span>
            <span class="sidebar-item__cat badge badge--{{ alg.category }}">
              {{ categoryLabel(alg.category) }}
            </span>
          </button>
        }

        <!-- Legend -->
        <div class="legend">
          <p class="legend__title">Categories</p>
          <div class="legend-item"><span class="badge badge--value-based">Value</span><span>Value-based</span></div>
          <div class="legend-item"><span class="badge badge--policy-gradient">PG</span><span>Policy Gradient</span></div>
          <div class="legend-item"><span class="badge badge--actor-critic">AC</span><span>Actor-Critic</span></div>
        </div>
      </aside>

      <!-- Detail panel -->
      <div class="overview__detail">
        <div class="detail-hero">
          <div class="detail-hero__left">
            <span class="badge badge--{{ selected().category }}">{{ categoryLabel(selected().category) }}</span>
            <h1 class="detail-hero__name">{{ selected().name }}</h1>
            <p class="detail-hero__tagline text-secondary">{{ selected().tagline }}</p>
          </div>
          <div class="detail-hero__bars">
            <div class="bar-row">
              <span class="bar-label">Sample efficiency</span>
              <div class="bar-track">
                <div class="bar-fill bar-fill--{{ selected().sampleEfficiency }}"></div>
              </div>
              <span class="bar-value text-secondary">{{ levelLabel(selected().sampleEfficiency) }}</span>
            </div>
            <div class="bar-row">
              <span class="bar-label">Stability</span>
              <div class="bar-track">
                <div class="bar-fill bar-fill--{{ selected().stability }}"></div>
              </div>
              <span class="bar-value text-secondary">{{ levelLabel(selected().stability) }}</span>
            </div>
            <div class="bar-row">
              <span class="bar-label">Complexity</span>
              <div class="bar-track">
                <div class="bar-fill bar-fill--{{ selected().complexity }}"></div>
              </div>
              <span class="bar-value text-secondary">{{ levelLabel(selected().complexity) }}</span>
            </div>
          </div>
        </div>

        <div class="detail-grid">

          <!-- Description -->
          <section class="detail-section detail-section--full">
            <h2 class="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="var(--accent)" stroke-width="1.5"/>
                <line x1="12" y1="8" x2="12" y2="12" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="12" cy="16" r="0.8" fill="var(--accent)"/>
              </svg>
              Overview
            </h2>
            <p class="section-body">{{ selected().description }}</p>
          </section>

          <!-- How it works -->
          <section class="detail-section detail-section--full">
            <h2 class="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <polyline points="9,18 15,12 9,6" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              How It Works
            </h2>
            <ol class="steps-list">
              @for (step of selected().howItWorks; track $index) {
                <li class="steps-list__item">
                  <span class="steps-list__num">{{ $index + 1 }}</span>
                  <span>{{ step }}</span>
                </li>
              }
            </ol>
          </section>

          <!-- Best for -->
          <section class="detail-section">
            <h2 class="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="var(--success)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Best For
            </h2>
            <ul class="check-list check-list--good">
              @for (item of selected().bestFor; track $index) {
                <li>{{ item }}</li>
              }
            </ul>
          </section>

          <!-- Not ideal for -->
          <section class="detail-section">
            <h2 class="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <line x1="18" y1="6" x2="6" y2="18" stroke="var(--danger)" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="6" y1="6" x2="18" y2="18" stroke="var(--danger)" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              Not Ideal For
            </h2>
            <ul class="check-list check-list--bad">
              @for (item of selected().notIdealFor; track $index) {
                <li>{{ item }}</li>
              }
            </ul>
          </section>

          <!-- Pros -->
          <section class="detail-section">
            <h2 class="section-title">Strengths</h2>
            <ul class="pill-list pill-list--pro">
              @for (p of selected().pros; track $index) {
                <li>{{ p }}</li>
              }
            </ul>
          </section>

          <!-- Cons -->
          <section class="detail-section">
            <h2 class="section-title">Weaknesses</h2>
            <ul class="pill-list pill-list--con">
              @for (c of selected().cons; track $index) {
                <li>{{ c }}</li>
              }
            </ul>
          </section>

          <!-- Key hyperparameters -->
          <section class="detail-section detail-section--full">
            <h2 class="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="var(--accent)" stroke-width="1.5"/>
                <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
                  stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              Key Hyperparameters
            </h2>
            <div class="params-grid">
              @for (p of selected().keyParams; track p.name) {
                <div class="param-card">
                  <span class="param-card__name">{{ p.name }}</span>
                  <span class="param-card__desc text-secondary">{{ p.desc }}</span>
                </div>
              }
            </div>
          </section>

        </div>
      </div>
    </div>
  `,
  styleUrl: './algorithm-overview.component.scss',
})
export class AlgorithmOverviewComponent {
  algorithms = ALGORITHMS;
  selected = signal<AlgorithmInfo>(ALGORITHMS[0]);

  select(alg: AlgorithmInfo): void {
    this.selected.set(alg);
  }

  categoryLabel(cat: string): string {
    const map: Record<string, string> = {
      'value-based': 'Value-Based',
      'policy-gradient': 'Policy Gradient',
      'actor-critic': 'Actor-Critic',
    };
    return map[cat] ?? cat;
  }

  levelLabel(level: string): string {
    const map: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High' };
    return map[level] ?? level;
  }
}
