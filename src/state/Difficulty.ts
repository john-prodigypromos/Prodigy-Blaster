// ── Difficulty presets ───────────────────────────────────

export type DifficultyLevel = 'beginner' | 'intermediate' | 'expert';

export interface DifficultyConfig {
  label: string;
  playerHull: number;
  playerShield: number;
  enemyHull: number;
  enemyShield: number;
  enemySpeedMult: number;
  enemyRotationMult: number;
  enemyFireRate: number;
  enemyChaseRange: number;
}

export const DIFFICULTY: Record<DifficultyLevel, DifficultyConfig> = {
  beginner: {
    label: 'BEGINNER',
    playerHull: 150,
    playerShield: 80,
    enemyHull: 500,
    enemyShield: 0,
    enemySpeedMult: 0.5,
    enemyRotationMult: 0.5,
    enemyFireRate: 350,
    enemyChaseRange: 450,
  },
  intermediate: {
    label: 'INTERMEDIATE',
    playerHull: 100,
    playerShield: 50,
    enemyHull: 750,
    enemyShield: 20,
    enemySpeedMult: 0.7,
    enemyRotationMult: 0.7,
    enemyFireRate: 200,
    enemyChaseRange: 600,
  },
  expert: {
    label: 'EXPERT',
    playerHull: 80,
    playerShield: 30,
    enemyHull: 1200,
    enemyShield: 50,
    enemySpeedMult: 1.0,
    enemyRotationMult: 1.0,
    enemyFireRate: 120,
    enemyChaseRange: 800,
  },
};

/** Global mutable selection — set by TitleScene, read by ArenaScene */
export let currentDifficulty: DifficultyLevel = 'intermediate';

export function setDifficulty(level: DifficultyLevel): void {
  currentDifficulty = level;
}
