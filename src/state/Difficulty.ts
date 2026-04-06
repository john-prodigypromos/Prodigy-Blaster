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
    playerHull: 200,
    playerShield: 100,
    enemyHull: 250,
    enemyShield: 0,
    enemySpeedMult: 0.5,
    enemyRotationMult: 0.5,
    enemyFireRate: 600,
    enemyChaseRange: 450,
  },
  intermediate: {
    label: 'INTERMEDIATE',
    playerHull: 150,
    playerShield: 80,
    enemyHull: 400,
    enemyShield: 0,
    enemySpeedMult: 0.6,
    enemyRotationMult: 0.6,
    enemyFireRate: 450,
    enemyChaseRange: 600,
  },
  expert: {
    label: 'EXPERT',
    playerHull: 100,
    playerShield: 50,
    enemyHull: 700,
    enemyShield: 30,
    enemySpeedMult: 0.8,
    enemyRotationMult: 0.8,
    enemyFireRate: 250,
    enemyChaseRange: 800,
  },
};

/** Global mutable selection — set by TitleScene, read by ArenaScene */
export let currentDifficulty: DifficultyLevel = 'intermediate';

export function setDifficulty(level: DifficultyLevel): void {
  currentDifficulty = level;
}
