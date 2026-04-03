import Phaser from 'phaser';
import { COLORS, getGameSize } from '../config';
import { createStarfieldTexture } from '../ui/Starfield';
import { addHighScore, getHighScores, HighScoreEntry } from '../state/HighScores';
import { SoundSystem } from '../systems/SoundSystem';

interface HighScoreData {
  score: number;
  level: number;
  difficulty: string;
}

export class HighScoreScene extends Phaser.Scene {
  private sound_sys!: SoundSystem;

  constructor() {
    super({ key: 'HighScore' });
  }

  create(data: HighScoreData): void {
    const { w, h } = getGameSize(this);
    const { score, level, difficulty } = data;

    if (!this.textures.exists('starfield')) {
      createStarfieldTexture(this, 'starfield');
    }
    this.add.image(w / 2, h / 2, 'starfield');
    this.cameras.main.setBackgroundColor(COLORS.arena);

    this.sound_sys = new SoundSystem();
    this.sound_sys.init();

    // ── Title ──
    this.add.text(w / 2, 30, 'ENTER YOUR NAME', {
      fontSize: '28px', fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
      color: '#ffcc00', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(100);

    this.add.text(w / 2, 65, `SCORE: ${score.toLocaleString()}`, {
      fontSize: '20px', fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(100);

    // ── Name input — use a hidden HTML input for iOS keyboard support ──
    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.maxLength = 20;
    inputEl.placeholder = 'Your name...';
    inputEl.autocomplete = 'off';
    inputEl.autocapitalize = 'characters';
    inputEl.style.cssText = `
      position: fixed;
      left: 50%; top: 50%;
      transform: translate(-50%, -50%);
      width: 280px;
      padding: 12px 16px;
      font-size: 22px;
      font-family: Arial, sans-serif;
      font-weight: bold;
      text-align: center;
      color: #ffffff;
      background: rgba(10, 18, 32, 0.95);
      border: 2px solid #ffcc00;
      border-radius: 8px;
      outline: none;
      z-index: 10000;
      caret-color: #ffcc00;
      letter-spacing: 2px;
    `;

    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'SUBMIT';
    submitBtn.style.cssText = `
      position: fixed;
      left: 50%; top: calc(50% + 50px);
      transform: translate(-50%, 0);
      padding: 10px 40px;
      font-size: 18px;
      font-family: Arial, sans-serif;
      font-weight: bold;
      color: #000000;
      background: #ffcc00;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      z-index: 10000;
      touch-action: manipulation;
    `;

    document.body.appendChild(inputEl);
    document.body.appendChild(submitBtn);

    // Auto-focus after a brief delay (helps iOS)
    setTimeout(() => inputEl.focus(), 200);

    const submitName = () => {
      const name = inputEl.value.trim().substring(0, 20) || 'ANON';

      // Remove HTML elements
      inputEl.remove();
      submitBtn.remove();

      // Save to leaderboard
      const entry: HighScoreEntry = {
        name: name.toUpperCase(),
        score,
        level,
        difficulty,
        date: new Date().toISOString(),
      };
      const insertIndex = addHighScore(entry);

      // Show leaderboard
      this.showLeaderboard(w, h, insertIndex);
    };

    submitBtn.addEventListener('click', submitName);
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitName();
    });
  }

  private showLeaderboard(w: number, h: number, highlightIndex: number): void {
    const scores = getHighScores();

    // Clear and redraw
    this.children.removeAll(true);

    if (!this.textures.exists('starfield')) {
      createStarfieldTexture(this, 'starfield');
    }
    this.add.image(w / 2, h / 2, 'starfield');

    // Title
    this.add.text(w / 2, 25, 'HIGH SCORES', {
      fontSize: '32px', fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
      color: '#ffcc00', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(100);

    // Table header
    const tableTop = 75;
    const rowH = 38;
    const rankX = w / 2 - 220;
    const nameX = w / 2 - 160;
    const scoreX = w / 2 + 120;
    const levelX = w / 2 + 220;

    this.add.text(rankX, tableTop, '#', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
      color: '#888888',
    }).setDepth(100);
    this.add.text(nameX, tableTop, 'NAME', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
      color: '#888888',
    }).setDepth(100);
    this.add.text(scoreX, tableTop, 'SCORE', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
      color: '#888888',
    }).setOrigin(1, 0).setDepth(100);
    this.add.text(levelX, tableTop, 'LVL', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
      color: '#888888',
    }).setOrigin(0.5, 0).setDepth(100);

    // Divider line
    const gfx = this.add.graphics().setDepth(100);
    gfx.lineStyle(1, 0x444444, 0.5);
    gfx.lineBetween(rankX, tableTop + 20, levelX + 30, tableTop + 20);

    // Score rows
    for (let i = 0; i < scores.length; i++) {
      const entry = scores[i];
      const y = tableTop + 30 + i * rowH;
      const isNew = i === highlightIndex;
      const color = isNew ? '#ffcc00' : '#ffffff';
      const alpha = isNew ? 1 : 0.8;

      // Highlight bar for new entry
      if (isNew) {
        gfx.fillStyle(0xffcc00, 0.1);
        gfx.fillRect(rankX - 10, y - 4, levelX - rankX + 60, rowH - 4);
      }

      this.add.text(rankX, y, `${i + 1}.`, {
        fontSize: '18px', fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
        color, stroke: '#000000', strokeThickness: 1,
      }).setAlpha(alpha).setDepth(100);

      this.add.text(nameX, y, entry.name, {
        fontSize: '18px', fontFamily: 'Arial, sans-serif', fontStyle: isNew ? 'bold' : 'normal',
        color, stroke: '#000000', strokeThickness: 1,
      }).setAlpha(alpha).setDepth(100);

      this.add.text(scoreX, y, entry.score.toLocaleString(), {
        fontSize: '18px', fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
        color, stroke: '#000000', strokeThickness: 1,
      }).setOrigin(1, 0).setAlpha(alpha).setDepth(100);

      this.add.text(levelX, y, `${entry.level}`, {
        fontSize: '18px', fontFamily: 'Arial, sans-serif',
        color, stroke: '#000000', strokeThickness: 1,
      }).setOrigin(0.5, 0).setAlpha(alpha).setDepth(100);
    }

    // Footer
    this.add.text(w / 2, h - 40, 'Press ENTER or tap for menu', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5, 0.5).setDepth(100);

    this.add.text(w - 16, h - 16, 'PRIDAY LABS', {
      fontSize: '18px', fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
      color: '#00ff66', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(1, 1).setDepth(100);

    // Go to title
    const goToTitle = () => this.scene.start('Title');
    this.input.keyboard!.once('keydown-ENTER', goToTitle);
    this.input.once('pointerdown', goToTitle);
  }
}
