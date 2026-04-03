import Phaser from 'phaser';
import { GAME_HEIGHT, runtime } from './config';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { LevelIntroScene } from './scenes/LevelIntroScene';
import { ArenaScene } from './scenes/ArenaScene';
import { HighScoreScene } from './scenes/HighScoreScene';

// Calculate game width from the actual container, not window
// This avoids iOS safe-area and toolbar measurement issues
function getContainerAspect(): number {
  const container = document.getElementById('game-container');
  if (container) {
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return rect.width / rect.height;
    }
  }
  return window.innerWidth / window.innerHeight;
}

const aspect = getContainerAspect();
const gameWidth = Math.round(GAME_HEIGHT * aspect);

// Update the mutable runtime width so all systems use the correct value
runtime.GAME_WIDTH = gameWidth;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: gameWidth,
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
  scene: [BootScene, TitleScene, CharacterSelectScene, LevelIntroScene, ArenaScene, HighScoreScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    expandParent: false,
    width: gameWidth,
    height: GAME_HEIGHT,
  },
  input: {
    activePointers: 4,
  },
};

const game = new Phaser.Game(config);

// On resize/orientation change, recalculate and resize the game
function handleResize() {
  const newAspect = getContainerAspect();
  const newWidth = Math.round(GAME_HEIGHT * newAspect);

  // Only resize if the aspect ratio actually changed meaningfully
  if (Math.abs(newWidth - game.scale.width) > 10) {
    runtime.GAME_WIDTH = newWidth;
    game.scale.resize(newWidth, GAME_HEIGHT);
  }
  game.scale.refresh();
}

// Debounce resize to avoid thrashing during iOS toolbar animation
let resizeTimer: ReturnType<typeof setTimeout>;
function debouncedResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(handleResize, 300);
}

window.addEventListener('resize', debouncedResize);
window.addEventListener('orientationchange', () => {
  // iOS needs extra delay after orientation change for viewport to settle
  setTimeout(handleResize, 300);
  setTimeout(handleResize, 600);
});

// Also handle iOS visual viewport resize (handles toolbar show/hide)
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', debouncedResize);
}
