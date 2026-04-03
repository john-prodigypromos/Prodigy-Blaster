// ── High Score Persistence ──────────────────────────────
// Top 10 scores stored in localStorage.

export interface HighScoreEntry {
  name: string;
  score: number;
  level: number;       // highest level reached (1-3)
  difficulty: string;   // beginner/intermediate/expert
  date: string;         // ISO date string
}

const STORAGE_KEY = 'ohyum_highscores';
const MAX_ENTRIES = 10;

function loadScores(): HighScoreEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HighScoreEntry[];
  } catch {
    return [];
  }
}

function saveScores(scores: HighScoreEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
}

export function getHighScores(): HighScoreEntry[] {
  return loadScores();
}

/** Returns the index where the new score was inserted, or -1 if it didn't make the board */
export function addHighScore(entry: HighScoreEntry): number {
  const scores = loadScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const trimmed = scores.slice(0, MAX_ENTRIES);
  saveScores(trimmed);
  return trimmed.findIndex(e => e === entry);
}

/** Check if a score would make the top 10 */
export function isHighScore(score: number): boolean {
  const scores = loadScores();
  if (scores.length < MAX_ENTRIES) return true;
  return score > scores[scores.length - 1].score;
}
