import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { ArenaScene } from './scenes/ArenaScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0a1220',
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, TitleScene, CharacterSelectScene, ArenaScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    expandParent: true,
    // Let Phaser resize when orientation changes
    fullscreenTarget: 'game-container',
  },
  input: {
    activePointers: 4,
  },
};

const game = new Phaser.Game(config);

// Force Phaser to re-check size after orientation changes and iOS address bar hide
window.addEventListener('resize', () => {
  setTimeout(() => game.scale.refresh(), 100);
});
window.addEventListener('orientationchange', () => {
  setTimeout(() => game.scale.refresh(), 200);
});
