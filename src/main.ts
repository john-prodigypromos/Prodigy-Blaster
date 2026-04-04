import Phaser from 'phaser';
import { GAME_HEIGHT, runtime } from './config';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { LevelIntroScene } from './scenes/LevelIntroScene';
import { ArenaScene } from './scenes/ArenaScene';
import { HighScoreScene } from './scenes/HighScoreScene';

// Get the most reliable viewport dimensions available.
// iOS Safari's getBoundingClientRect() is unreliable at startup —
// it can return pre-layout (portrait) dimensions on a landscape screen.
// The visualViewport API is the most accurate on iOS.
function getViewportSize(): { width: number; height: number } {
  if (window.visualViewport) {
    return { width: window.visualViewport.width, height: window.visualViewport.height };
  }
  // document.documentElement.clientWidth excludes scrollbar, more reliable than innerWidth
  return {
    width: document.documentElement.clientWidth || window.innerWidth,
    height: document.documentElement.clientHeight || window.innerHeight,
  };
}

function getAspect(): number {
  const { width, height } = getViewportSize();
  if (width > 0 && height > 0) return width / height;
  return 16 / 9; // safe fallback
}

function initGame() {
  const aspect = getAspect();
  const gameWidth = Math.round(GAME_HEIGHT * aspect);
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
    const newAspect = getAspect();
    const newWidth = Math.round(GAME_HEIGHT * newAspect);

    if (Math.abs(newWidth - game.scale.width) > 2) {
      runtime.GAME_WIDTH = newWidth;
      game.scale.resize(newWidth, GAME_HEIGHT);
    }
    game.scale.refresh();
  }

  // Debounce resize to avoid thrashing during iOS toolbar animation
  let resizeTimer: ReturnType<typeof setTimeout>;
  function debouncedResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 150);
  }

  window.addEventListener('resize', debouncedResize);
  window.addEventListener('orientationchange', () => {
    // iOS needs extra delay after orientation change for viewport to settle
    setTimeout(handleResize, 300);
    setTimeout(handleResize, 600);
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', debouncedResize);
  }

  // iOS safety net: re-check dimensions shortly after init in case the
  // viewport wasn't settled when we first measured.
  setTimeout(handleResize, 100);
  setTimeout(handleResize, 500);
}

// Wait for DOM to be ready before measuring viewport — iOS Safari reports
// wrong dimensions if we measure before layout is complete.
if (document.readyState === 'complete') {
  initGame();
} else {
  window.addEventListener('load', initGame);
}
