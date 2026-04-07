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
    playerHull: 180,
    playerShield: 80,
    enemyHull: 350,
    enemyShield: 0,
    enemySpeedMult: 0.6,
    enemyRotationMult: 0.6,
    enemyFireRate: 500,
    enemyChaseRange: 500,
  },
  intermediate: {
    label: 'INTERMEDIATE',
    playerHull: 120,
    playerShield: 60,
    enemyHull: 500,
    enemyShield: 15,
    enemySpeedMult: 0.75,
    enemyRotationMult: 0.75,
    enemyFireRate: 350,
    enemyChaseRange: 700,
  },
  expert: {
    label: 'EXPERT',
    playerHull: 80,
    playerShield: 40,
    enemyHull: 800,
    enemyShield: 40,
    enemySpeedMult: 0.9,
    enemyRotationMult: 0.9,
    enemyFireRate: 200,
    enemyChaseRange: 900,
  },
};

/** Global mutable selection — set by TitleScene, read by ArenaScene */
export let currentDifficulty: DifficultyLevel = 'intermediate';

export function setDifficulty(level: DifficultyLevel): void {
  currentDifficulty = level;
}
