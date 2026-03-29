export interface ArenaState {
  currentOpponent: number;
  score: number;
  highScores: number[];
  ladderDefeated: boolean[];
  cybertruckUnlocked: boolean;
  settings: {
    sfxVolume: number;
    musicVolume: number;
    screenShake: boolean;
  };
}

const DEFAULT_STATE: ArenaState = {
  currentOpponent: 0,
  score: 0,
  highScores: new Array(16).fill(0),
  ladderDefeated: new Array(16).fill(false),
  cybertruckUnlocked: false,
  settings: {
    sfxVolume: 0.7,
    musicVolume: 0.5,
    screenShake: true,
  },
};

class GameStateManager {
  private data: ArenaState;

  constructor() {
    this.data = structuredClone(DEFAULT_STATE);
  }

  get state(): ArenaState { return this.data; }
  get currentOpponent(): number { return this.data.currentOpponent; }
  get score(): number { return this.data.score; }

  addScore(points: number): void {
    this.data.score += points;
  }

  recordVictory(opponentIndex: number, matchScore: number): void {
    this.data.ladderDefeated[opponentIndex] = true;
    if (matchScore > this.data.highScores[opponentIndex]) {
      this.data.highScores[opponentIndex] = matchScore;
    }
    if (opponentIndex < 15) {
      this.data.currentOpponent = opponentIndex + 1;
    }
    if (opponentIndex === 15) {
      this.data.cybertruckUnlocked = true;
    }
  }

  save(): void {
    localStorage.setItem('ohyum_arena_save', JSON.stringify(this.data));
  }

  load(): boolean {
    const raw = localStorage.getItem('ohyum_arena_save');
    if (!raw) return false;
    try {
      this.data = JSON.parse(raw) as ArenaState;
      return true;
    } catch {
      return false;
    }
  }

  reset(): void {
    this.data = structuredClone(DEFAULT_STATE);
  }
}

export const GameState = new GameStateManager();
