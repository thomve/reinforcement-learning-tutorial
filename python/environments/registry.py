from typing import Dict, Any, List

ENVIRONMENTS: Dict[str, Dict[str, Any]] = {
    "CartPole-v1": {
        "id": "CartPole-v1",
        "display_name": "Cart Pole",
        "description": (
            "Balance a pole on a moving cart. "
            "Classic control problem — great first environment."
        ),
        "difficulty": "easy",
        "obs_space": "continuous",
        "obs_dim": 4,
        "action_space": "discrete",
        "n_actions": 2,
        "max_reward": 500.0,
        "solved_threshold": 475.0,
        "compatible_algorithms": ["dqn", "ppo", "reinforce"],
        "requires_box2d": False,
    },
    "MountainCar-v0": {
        "id": "MountainCar-v0",
        "display_name": "Mountain Car",
        "description": (
            "Drive an underpowered car up a hill. "
            "Sparse reward — a great challenge for exploration."
        ),
        "difficulty": "medium",
        "obs_space": "continuous",
        "obs_dim": 2,
        "action_space": "discrete",
        "n_actions": 3,
        "max_reward": -100.0,
        "solved_threshold": -110.0,
        "compatible_algorithms": ["dqn", "ppo", "reinforce", "q_learning"],
        "requires_box2d": False,
    },
    "Acrobot-v1": {
        "id": "Acrobot-v1",
        "display_name": "Acrobot",
        "description": (
            "Swing a two-link robot arm up above a threshold. "
            "Underactuated control — harder than it looks."
        ),
        "difficulty": "medium",
        "obs_space": "continuous",
        "obs_dim": 6,
        "action_space": "discrete",
        "n_actions": 3,
        "max_reward": -100.0,
        "solved_threshold": -100.0,
        "compatible_algorithms": ["dqn", "ppo", "reinforce", "q_learning"],
        "requires_box2d": False,
    },
    "LunarLander-v3": {
        "id": "LunarLander-v3",
        "display_name": "Lunar Lander",
        "description": (
            "Land a spacecraft on the moon. "
            "Visually impressive; needs Box2D installed."
        ),
        "difficulty": "hard",
        "obs_space": "continuous",
        "obs_dim": 8,
        "action_space": "discrete",
        "n_actions": 4,
        "max_reward": 300.0,
        "solved_threshold": 200.0,
        "compatible_algorithms": ["dqn", "ppo", "reinforce"],
        "requires_box2d": True,
    },
}


def get_environment_list() -> List[Dict[str, Any]]:
    return list(ENVIRONMENTS.values())


def get_environment(env_id: str) -> Dict[str, Any]:
    if env_id not in ENVIRONMENTS:
        raise ValueError(f"Unknown environment: {env_id}. Available: {list(ENVIRONMENTS.keys())}")
    return ENVIRONMENTS[env_id]
