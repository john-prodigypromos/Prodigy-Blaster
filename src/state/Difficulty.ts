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
  enemyDragMult: number;     // drag multiplier — <1 = floatier, can't brake hard
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
  // BEGINNER — accel & decel both cut further; bumped fire/aggression for closer engagement
  beginner: {
    label: 'BEGINNER',
    playerHull: 400,
    playerShield: 200,
    enemyHull: 200,
    enemyShield: 0,
    enemySpeedMult: 1.0,
    enemyAccelMult: 0.35,  // thrust 35% — winds up much more slowly
    enemyDragMult: 0.5,    // drag halved — coasts more, can't brake on a dime
    enemyRotationMult: 1.20,
    enemyFireRate: 280,    // ~30% more frequent than 376
    enemyChaseRange: 1000, // pursues the player further
    aiSensitivity: 2.66,
    aiAggression: 0.5,     // ↑ from 0.27 — more relentless pursuit
    aiJinkIntensity: 0.20,
    aiLeashRange: 150,     // ↓ from 226 — engages closer
    aiFireCone: 0.28,      // wider cone — fires earlier when on target
  },
  // INTERMEDIATE — same treatment, scaled for the harder tier
  intermediate: {
    label: 'INTERMEDIATE',
    playerHull: 280,
    playerShield: 140,
    enemyHull: 350,
    enemyShield: 10,
    enemySpeedMult: 1.10,
    enemyAccelMult: 0.55,  // ↓ from 0.8
    enemyDragMult: 0.65,   // floatier — less braking ability
    enemyRotationMult: 1.58,
    enemyFireRate: 80,     // ~30% more frequent than 107
    enemyChaseRange: 1400,
    aiSensitivity: 6.75,
    aiAggression: 1.0,     // maxed — full pursuit
    aiJinkIntensity: 0.83,
    aiLeashRange: 100,     // ↓ from 147
    aiFireCone: 0.13,
  },
  // EXPERT — accel/decel still cut (user said all difficulty levels)
  expert: {
    label: 'EXPERT',
    playerHull: 180,
    playerShield: 90,
    enemyHull: 550,
    enemyShield: 25,
    enemySpeedMult: 1.20,
    enemyAccelMult: 0.7,   // ↓ from 1.0
    enemyDragMult: 0.8,    // slight float — still mostly snappy at top tier
    enemyRotationMult: 2.79,
    enemyFireRate: 18,     // ~30% more frequent than 25
    enemyChaseRange: 2000,
    aiSensitivity: 11.7,
    aiAggression: 1.0,
    aiJinkIntensity: 1.0,
    aiLeashRange: 60,      // ↓ from 89 — tight close-quarters
    aiFireCone: 0.04,
  },
};

/** Global mutable selection — set by TitleScene, read by ArenaScene */
export let currentDifficulty: DifficultyLevel = 'intermediate';

export function setDifficulty(level: DifficultyLevel): void {
  currentDifficulty = level;
}
