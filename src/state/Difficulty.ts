// ── Difficulty presets ───────────────────────────────────

export type DifficultyLevel = 'beginner' | 'intermediate' | 'expert';

export interface DifficultyConfig {
  label: string;
  playerHull: number;
  playerShield: number;
  enemyHull: number;
  enemyShield: number;
  enemySpeedMult: number;
  enemyAccelMult: number;    // thrust multiplier — independent of top speed
  enemyRotationMult: number;
  enemyFireRate: number;
  enemyChaseRange: number;
  // AI behavior tuning — scales aggression with skill level
  aiSensitivity: number;     // steering sharpness: 2.0 lazy → 5.0 razor
  aiAggression: number;      // 0.0-1.0 — pursuit relentlessness, phase duration scaling
  aiJinkIntensity: number;   // 0.0-1.0 — evasive weaving strength
  aiLeashRange: number;      // max distance before forced re-engage
  aiFireCone: number;        // dot-product threshold for allowing fire (lower = wider cone)
}

export const DIFFICULTY: Record<DifficultyLevel, DifficultyConfig> = {
  // BEGINNER — fire rate unchanged; accel cut 50% (lazier acceleration)
  beginner: {
    label: 'BEGINNER',
    playerHull: 400,
    playerShield: 200,
    enemyHull: 200,
    enemyShield: 0,
    enemySpeedMult: 1.0,  // top speed matches player
    enemyAccelMult: 0.5,  // thrust halved — slower to wind up
    enemyRotationMult: 1.20,
    enemyFireRate: 376,
    enemyChaseRange: 665,
    aiSensitivity: 2.66,
    aiAggression: 0.27,
    aiJinkIntensity: 0.20,
    aiLeashRange: 226,
    aiFireCone: 0.34,
  },
  // INTERMEDIATE — fire rate +30% more frequent; accel -20%
  intermediate: {
    label: 'INTERMEDIATE',
    playerHull: 280,
    playerShield: 140,
    enemyHull: 350,
    enemyShield: 10,
    enemySpeedMult: 1.10,
    enemyAccelMult: 0.8,  // thrust 80% — slightly less snappy
    enemyRotationMult: 1.58,
    enemyFireRate: 107,   // 139 / 1.3 — fires 30% more often
    enemyChaseRange: 1050,
    aiSensitivity: 6.75,
    aiAggression: 0.9,
    aiJinkIntensity: 0.83,
    aiLeashRange: 147,
    aiFireCone: 0.17,
  },
  // EXPERT — fire rate +70% more frequent; accel unchanged
  expert: {
    label: 'EXPERT',
    playerHull: 180,
    playerShield: 90,
    enemyHull: 550,
    enemyShield: 25,
    enemySpeedMult: 1.20,
    enemyAccelMult: 1.0,  // full thrust — snap-to-attack
    enemyRotationMult: 2.79,
    enemyFireRate: 25,    // 43 / 1.7 — fires 70% more often
    enemyChaseRange: 1620,
    aiSensitivity: 11.7,
    aiAggression: 1.0,
    aiJinkIntensity: 1.0,
    aiLeashRange: 89,
    aiFireCone: 0.056,
  },
};

/** Global mutable selection — set by TitleScene, read by ArenaScene */
export let currentDifficulty: DifficultyLevel = 'intermediate';

export function setDifficulty(level: DifficultyLevel): void {
  currentDifficulty = level;
}
