// ── OH-YUM BLASTER 3D — Main Entry Point ────────────────
// Full game loop: title → charSelect → levelIntro → arena → highScore

import * as THREE from 'three';
import { createRenderer, handleRendererResize, type RendererBundle } from './renderer/SetupRenderer';
import { createSpaceEnvironment, type SpaceEnvironment } from './renderer/Environment';
import { SceneManager, type SceneState } from './state/SceneManager';
import { createArenaState, updateArena, cleanupArena, type ArenaState } from './scenes/ArenaLoop';
import { HUD3D } from './ui/HUD3D';
import { setDifficulty, type DifficultyLevel } from './state/Difficulty';
import { resetLevelState, currentLevelIndex, advanceLevel, getCurrentLevel, totalScore } from './state/LevelState';
import { setCharacter, currentCharacter } from './state/Character';
import { addHighScore, getHighScores } from './state/HighScores';
import { currentDifficulty } from './state/Difficulty';
import { COLORS } from './config';
import { SoundSystem } from './systems/SoundSystem';
import { getSpawnTaunt, getWinTaunt } from './config/VillainTaunts';
import { createCinematic, updateCinematic, cleanupCinematic, type CinematicState } from './scenes/TakeoffCinematic';

// ── Globals ──
let bundle: RendererBundle;
let clock: THREE.Clock;
let sceneManager: SceneManager;
let arena: ArenaState | null = null;
let hud: HUD3D | null = null;
let cinematic: CinematicState | null = null;
let spaceEnv: SpaceEnvironment;
let globalSound: import('./systems/SoundSystem').SoundSystem | null = null;
const keys: Record<string, boolean> = {};

// ── Overlay elements ──
let overlayEl: HTMLDivElement;
let crosshairEl: HTMLElement;
let pauseOverlay: HTMLDivElement | null = null;

function init() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error('Missing #game-canvas element');

  overlayEl = document.getElementById('ui-overlay') as HTMLDivElement;
  crosshairEl = document.getElementById('crosshair') as HTMLElement;

  // ── Renderer + environment ──
  bundle = createRenderer(canvas);
  spaceEnv = createSpaceEnvironment(bundle.scene, bundle.renderer, bundle.camera);

  // Start camera in a cinematic position
  bundle.camera.position.set(0, 10, 30);
  bundle.camera.lookAt(0, 0, 0);

  // ── Input ──
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Escape' && sceneManager.current === 'arena' && arena) {
      togglePause();
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  // ── Resize ──
  const onResize = () => handleRendererResize(bundle);
  window.addEventListener('resize', onResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onResize);
  }

  clock = new THREE.Clock();

  // ── Scene Manager ──
  sceneManager = new SceneManager({
    onEnter: handleSceneEnter,
    onExit: handleSceneExit,
  });
  sceneManager.start('title');

  // Start music on first click (browser autoplay policy requires user gesture)
  const startGlobalMusic = () => {
    if (!globalSound) {
      globalSound = new SoundSystem();
      globalSound.init();
      globalSound.startMusic();
    }
    document.removeEventListener('click', startGlobalMusic);
    document.removeEventListener('touchstart', startGlobalMusic);
  };
  document.addEventListener('click', startGlobalMusic);
  document.addEventListener('touchstart', startGlobalMusic);

  animate();
}

// ── Scene Transitions ──

function handleSceneEnter(state: SceneState, _prev: SceneState | null): void {
  switch (state) {
    case 'title':
      showTitleOverlay();
      crosshairEl.style.display = 'none';
      break;
    case 'charSelect':
      showCharSelectOverlay();
      break;
    case 'levelIntro':
      showLevelIntroOverlay();
      break;
    case 'cinematic':
      startCinematic();
      break;
    case 'arena':
      startArena();
      break;
    case 'highScore':
      showHighScoreOverlay();
      break;
    case 'gameOver':
      showGameOverOverlay();
      break;
  }
}

function handleSceneExit(state: SceneState, _next: SceneState): void {
  clearOverlay();
  removePauseOverlay();
  if (state === 'arena' && arena) {
    cleanupArena(arena, bundle.scene);
    hud?.destroy();
    hud = null;
    arena = null;
    crosshairEl.style.display = 'none';
  }
  if (state === 'cinematic' && cinematic) {
    cleanupCinematic(cinematic, bundle.scene);
    cinematic = null;
  }
}

// ── Overlays ──

function clearOverlay(): void {
  // Remove all overlay children except the HUD
  const children = Array.from(overlayEl.children);
  for (const child of children) {
    if ((child as HTMLElement).id !== 'hud') {
      child.remove();
    }
  }
  // Force-remove any lingering death-fx elements (spawned by setTimeout during player death)
  document.querySelectorAll('.death-fx, .explosion-fx').forEach(el => el.remove());
}

function createOverlayPanel(cssClass = 'overlay-panel'): HTMLDivElement {
  const panel = document.createElement('div');
  panel.className = cssClass;
  panel.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    background:rgba(2,5,8,0.85);z-index:30;
    font-family:Rajdhani,sans-serif;color:#fff;
    pointer-events:auto;overflow-y:auto;padding:20px 16px;
  `;
  overlayEl.appendChild(panel);
  return panel;
}

function showTitleOverlay(): void {
  const panel = createOverlayPanel();

  // Prodigy logo — large and prominent
  const logo = document.createElement('img');
  logo.src = '/portraits/prodigy-logo.png';
  logo.alt = 'Prodigy Promos';
  logo.style.cssText = 'width:clamp(120px,30vw,240px);height:auto;object-fit:contain;margin-bottom:20px;filter:drop-shadow(0 0 20px rgba(0,200,255,0.3));';
  panel.appendChild(logo);

  const title = document.createElement('div');
  title.textContent = 'OH-YUM BLASTER';
  title.style.cssText = 'font-size:clamp(28px,7vw,56px);font-weight:900;letter-spacing:6px;margin-bottom:12px;text-align:center;font-family:Orbitron,sans-serif;text-shadow:0 0 30px rgba(0,200,255,0.3),0 0 60px rgba(0,100,255,0.15);';
  panel.appendChild(title);

  const spacer = document.createElement('div');
  spacer.style.cssText = 'margin-bottom:30px;';
  panel.appendChild(spacer);

  const selectLabel = document.createElement('div');
  selectLabel.textContent = 'SELECT DIFFICULTY';
  selectLabel.style.cssText = 'font-size:clamp(14px,3vw,18px);letter-spacing:2px;margin-bottom:16px;';
  panel.appendChild(selectLabel);

  const difficulties: { key: DifficultyLevel; label: string; color: string; desc: string }[] = [
    { key: 'beginner', label: 'BEGINNER', color: '#44ff44', desc: 'Slow enemy • Extra shields • Relaxed pace' },
    { key: 'intermediate', label: 'INTERMEDIATE', color: '#ffcc00', desc: 'Balanced combat • Standard loadout' },
    { key: 'expert', label: 'EXPERT', color: '#ff4444', desc: 'Fast & aggressive • Tough enemy • Less armor' },
  ];

  for (const d of difficulties) {
    const btn = document.createElement('button');
    btn.style.cssText = `
      display:block;width:min(360px,85vw);padding:10px 16px;margin:6px 0;
      background:rgba(17,24,34,0.9);border:2px solid ${d.color};
      color:${d.color};font-size:clamp(14px,3.5vw,18px);font-weight:bold;font-family:Rajdhani,sans-serif;
      cursor:pointer;border-radius:4px;text-align:center;
    `;
    btn.textContent = d.label;

    const desc = document.createElement('div');
    desc.textContent = d.desc;
    desc.style.cssText = 'font-size:11px;color:#ccc;font-weight:normal;margin-top:4px;';
    btn.appendChild(desc);

    btn.addEventListener('click', () => {
      setDifficulty(d.key);
      resetLevelState();
      sceneManager.transition('charSelect');
    });
    btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(26,40,56,0.95)'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(17,24,34,0.9)'; });
    panel.appendChild(btn);
  }

  // High scores
  const scores = getHighScores();
  if (scores.length > 0) {
    const hsTitle = document.createElement('div');
    hsTitle.textContent = 'HIGH SCORES';
    hsTitle.style.cssText = 'font-size:14px;color:#ffcc00;margin-top:30px;letter-spacing:2px;';
    panel.appendChild(hsTitle);

    for (const entry of scores.slice(0, 5)) {
      const row = document.createElement('div');
      row.textContent = `${entry.name} — ${entry.score.toLocaleString()}`;
      row.style.cssText = 'font-size:12px;color:#aaa;margin-top:4px;';
      panel.appendChild(row);
    }
  }

  const footer = document.createElement('div');
  footer.textContent = 'PRIDAY LABS';
  footer.style.cssText = 'position:absolute;bottom:16px;right:16px;font-size:16px;font-weight:bold;color:#00ff66;';
  panel.appendChild(footer);
}

function showCharSelectOverlay(): void {
  const panel = createOverlayPanel();

  const title = document.createElement('div');
  title.textContent = 'CHOOSE YOUR PILOT';
  title.style.cssText = 'font-size:clamp(18px,5vw,28px);font-weight:bold;letter-spacing:3px;margin-bottom:20px;text-align:center;';
  panel.appendChild(title);

  const chars = [
    { id: 'owen', name: 'OWEN', tagline: 'Precision striker', color: 0x88aacc },
    { id: 'william', name: 'WILLIAM', tagline: 'Aggressive brawler', color: 0xccaa44 },
  ];

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:30px;';

  for (const c of chars) {
    const card = document.createElement('button');
    card.style.cssText = `
      width:min(200px,40vw);padding:12px 16px;background:rgba(17,24,34,0.9);
      border:2px solid #${c.color.toString(16).padStart(6, '0')};
      color:#fff;font-family:Rajdhani,sans-serif;cursor:pointer;border-radius:6px;
      text-align:center;
    `;

    // Portrait image
    const portrait = document.createElement('img');
    portrait.src = `/portraits/${c.id}.jpg`;
    portrait.alt = c.name;
    portrait.style.cssText = 'width:clamp(80px,20vw,140px);height:clamp(80px,20vw,140px);border-radius:50%;object-fit:cover;margin-bottom:10px;border:3px solid #' + c.color.toString(16).padStart(6, '0') + ';';
    card.appendChild(portrait);

    const name = document.createElement('div');
    name.textContent = c.name;
    name.style.cssText = 'font-size:22px;font-weight:bold;margin-bottom:8px;';
    card.appendChild(name);

    const tag = document.createElement('div');
    tag.textContent = c.tagline;
    tag.style.cssText = 'font-size:12px;color:#aaa;';
    card.appendChild(tag);

    card.addEventListener('click', () => {
      setCharacter(c.id as 'owen' | 'william');
      sceneManager.transition('levelIntro');
    });
    card.addEventListener('mouseenter', () => { card.style.background = 'rgba(26,40,56,0.95)'; });
    card.addEventListener('mouseleave', () => { card.style.background = 'rgba(17,24,34,0.9)'; });
    row.appendChild(card);
  }

  panel.appendChild(row);
}

// Villain intro data — portrait, name, and taunt per level
const VILLAIN_INTROS = [
  { name: 'BOLO TIE', portrait: 'bolo-tie.jpg', taunt: 'Wo unto the liar...' },
  { name: 'BOW TIE', portrait: 'bow-tie.jpg', taunt: 'Are you a thug nasty?' },
  { name: 'BISHOP', portrait: 'bishop.jpg', taunt: 'I find you deplorable!' },
];

function showLevelIntroOverlay(): void {
  const panel = createOverlayPanel();
  const level = getCurrentLevel();

  // Level number
  const levelText = document.createElement('div');
  levelText.textContent = `LEVEL ${level.level}`;
  levelText.style.cssText = `
    font-size:clamp(32px,10vw,64px);font-weight:bold;letter-spacing:4px;
    animation: scaleIn 0.5s ease-out;
  `;
  panel.appendChild(levelText);

  const subtitle = document.createElement('div');
  subtitle.textContent = level.subtitle;
  subtitle.style.cssText = 'font-size:20px;color:#ffcc00;margin-top:12px;letter-spacing:2px;opacity:0;animation:fadeIn 0.5s 0.3s forwards;';
  panel.appendChild(subtitle);

  // ── Villain intro cards — show new enemies for this level ──
  const villainRow = document.createElement('div');
  villainRow.style.cssText = 'display:flex;gap:30px;margin-top:30px;opacity:0;animation:fadeIn 0.6s 0.8s forwards;';

  // Show villains up to current level (Level 1 = index 0, Level 2 = 0+1, etc.)
  for (let i = 0; i < level.level && i < VILLAIN_INTROS.length; i++) {
    const villain = VILLAIN_INTROS[i];
    const isNew = i === level.level - 1; // highlight the newest enemy

    const card = document.createElement('div');
    card.style.cssText = `
      display:flex;flex-direction:column;align-items:center;
      padding:16px 20px;background:rgba(40,10,10,${isNew ? '0.8' : '0.4'});
      border:2px solid ${isNew ? '#ff4444' : '#662222'};border-radius:8px;
      ${isNew ? 'animation:villainPulse 1.5s ease-in-out infinite alternate;' : ''}
    `;

    // Portrait
    const img = document.createElement('img');
    img.src = `/portraits/${villain.portrait}`;
    img.style.cssText = `
      width:clamp(140px,35vw,240px);height:clamp(140px,35vw,240px);border-radius:50%;object-fit:cover;
      border:3px solid ${isNew ? '#ff4444' : '#662222'};margin-bottom:10px;
      ${isNew ? 'filter:drop-shadow(0 0 12px rgba(255,50,0,0.5));' : ''}
    `;
    card.appendChild(img);

    // Name
    const name = document.createElement('div');
    name.textContent = villain.name;
    name.style.cssText = `
      font-size:18px;font-weight:bold;color:${isNew ? '#ff4444' : '#884444'};
      letter-spacing:2px;margin-bottom:6px;
      ${isNew ? 'text-shadow:0 0 10px rgba(255,50,0,0.4);' : ''}
    `;
    card.appendChild(name);

    villainRow.appendChild(card);
  }

  panel.appendChild(villainRow);

  // Inject animations
  if (!document.getElementById('level-intro-css')) {
    const style = document.createElement('style');
    style.id = 'level-intro-css';
    style.textContent = `
      @keyframes scaleIn { from { transform:scale(0.3);opacity:0; } to { transform:scale(1);opacity:1; } }
      @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      @keyframes villainPulse { from { border-color:#ff4444;box-shadow:0 0 15px rgba(255,50,0,0.3); } to { border-color:#ff6644;box-shadow:0 0 30px rgba(255,50,0,0.5); } }
    `;
    document.head.appendChild(style);
  }

  // Longer delay to let players read the villain intro — 4.5s
  setTimeout(() => {
    if (sceneManager.current === 'levelIntro') {
      sceneManager.transition('arena');
    }
  }, 4500);
}

function togglePause(): void {
  if (!arena) return;
  arena.paused = !arena.paused;

  if (arena.paused) {
    // Show pause overlay
    pauseOverlay = document.createElement('div');
    pauseOverlay.id = 'pause-overlay';
    pauseOverlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:rgba(2,5,8,0.75);z-index:50;
      font-family:Rajdhani,sans-serif;color:#fff;
      pointer-events:auto;
    `;

    const title = document.createElement('div');
    title.textContent = 'PAUSED';
    title.style.cssText = `
      font-size:clamp(32px,8vw,56px);font-weight:900;letter-spacing:6px;
      font-family:Orbitron,sans-serif;
      text-shadow:0 0 20px rgba(0,200,255,0.4);
      margin-bottom:24px;
    `;
    pauseOverlay.appendChild(title);

    const hint = document.createElement('div');
    hint.textContent = 'Press ESC to resume';
    hint.style.cssText = 'font-size:16px;color:#88aacc;letter-spacing:2px;margin-bottom:32px;';
    pauseOverlay.appendChild(hint);

    const quitBtn = document.createElement('button');
    quitBtn.textContent = 'QUIT TO TITLE';
    quitBtn.style.cssText = `
      padding:12px 32px;background:rgba(17,24,34,0.9);border:2px solid #ff4444;
      color:#ff4444;font-size:16px;font-weight:bold;font-family:Rajdhani,sans-serif;
      cursor:pointer;border-radius:4px;
    `;
    quitBtn.addEventListener('click', () => {
      arena!.paused = false;
      removePauseOverlay();
      sceneManager.transition('title');
    });
    quitBtn.addEventListener('mouseenter', () => { quitBtn.style.background = 'rgba(40,15,15,0.95)'; });
    quitBtn.addEventListener('mouseleave', () => { quitBtn.style.background = 'rgba(17,24,34,0.9)'; });
    pauseOverlay.appendChild(quitBtn);

    overlayEl.appendChild(pauseOverlay);
  } else {
    removePauseOverlay();
  }
}

function removePauseOverlay(): void {
  if (pauseOverlay) {
    pauseOverlay.remove();
    pauseOverlay = null;
  }
}

function startCinematic(): void {
  crosshairEl.style.display = 'none';
  cinematic = createCinematic(bundle.scene, bundle.camera);
}

function startArena(): void {
  const char = currentCharacter;
  const playerColor = char === 'william' ? 0xccaa44 : COLORS.player;

  arena = createArenaState(
    bundle.scene,
    bundle.camera,
    currentLevelIndex + 1,
    totalScore,
    playerColor,
  );

  hud = new HUD3D();
  crosshairEl.style.display = 'block';

  // Level start sound
  arena.sound.levelStart();
}

function showHighScoreOverlay(): void {
  const panel = createOverlayPanel();
  const finalScore = arena?.score ?? totalScore;

  // Pilot portrait — victory celebration
  const pilotImg = document.createElement('img');
  pilotImg.src = `/portraits/${currentCharacter}.jpg`;
  pilotImg.alt = currentCharacter;
  pilotImg.style.cssText = `
    width:clamp(80px,20vw,160px);height:clamp(80px,20vw,160px);border-radius:50%;object-fit:cover;
    border:4px solid #ffcc00;margin-bottom:12px;
    animation: heroGlow 1.5s ease-in-out infinite alternate;
  `;
  panel.appendChild(pilotImg);

  const title = document.createElement('div');
  title.textContent = 'YOU SAVED HUMANITY FROM EVIL!';
  title.style.cssText = `
    font-size:clamp(18px,5vw,32px);font-weight:bold;color:#ffcc00;letter-spacing:2px;
    margin-bottom:8px;text-align:center;
    text-shadow:0 0 20px rgba(255,204,0,0.5);
    animation: heroGlow 1.5s ease-in-out infinite alternate;
  `;
  panel.appendChild(title);

  const subtitle = document.createElement('div');
  subtitle.textContent = 'GREAT JOB!';
  subtitle.style.cssText = 'font-size:22px;color:#44ff44;margin-bottom:8px;font-weight:bold;letter-spacing:4px;';
  panel.appendChild(subtitle);

  const scoreText = document.createElement('div');
  scoreText.textContent = `FINAL SCORE: ${finalScore.toLocaleString()}`;
  scoreText.style.cssText = 'font-size:20px;margin-bottom:24px;color:#fff;';
  panel.appendChild(scoreText);

  // Inject glow animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes heroGlow { from { filter:brightness(1); } to { filter:brightness(1.2); } }
  `;
  document.head.appendChild(style);

  // Play victory sounds
  if (arena?.sound) {
    arena.sound.victory();
    setTimeout(() => arena?.sound.yay(), 800);
  }

  // Name entry
  const nameLabel = document.createElement('div');
  nameLabel.textContent = 'ENTER YOUR NAME:';
  nameLabel.style.cssText = 'font-size:14px;color:#aaa;margin-bottom:8px;';
  panel.appendChild(nameLabel);

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.maxLength = 12;
  nameInput.placeholder = 'YOUR NAME';
  nameInput.style.cssText = `
    width:200px;padding:10px;background:rgba(17,24,34,0.9);
    border:2px solid #ffcc00;color:#fff;font-size:18px;font-family:Rajdhani,sans-serif;
    text-align:center;border-radius:4px;outline:none;
  `;
  nameInput.addEventListener('input', () => {
    nameInput.value = nameInput.value.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 12);
  });
  panel.appendChild(nameInput);

  const submitScore = () => {
    const name = nameInput.value.trim() || 'ANON';
    addHighScore({
      name,
      score: finalScore,
      level: currentLevelIndex + 1,
      difficulty: currentDifficulty,
      date: new Date().toISOString(),
    });
    sceneManager.transition('title');
  };

  // Submit on Enter/Return key
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitScore();
  });

  const submitBtn = document.createElement('button');
  submitBtn.textContent = 'SAVE SCORE';
  submitBtn.style.cssText = `
    margin-top:16px;padding:12px 32px;background:#ffcc00;color:#000;
    font-size:16px;font-weight:bold;border:none;border-radius:4px;
    cursor:pointer;font-family:Rajdhani,sans-serif;
  `;
  submitBtn.addEventListener('click', submitScore);
  panel.appendChild(submitBtn);

  setTimeout(() => nameInput.focus(), 100);
}

function showGameOverOverlay(): void {
  const panel = createOverlayPanel();

  // Villain portrait — show the enemy from the current level
  const enemyPortraits = ['bolo-tie.jpg', 'bow-tie.jpg', 'bishop.jpg'];
  const villainFile = enemyPortraits[Math.min(currentLevelIndex, enemyPortraits.length - 1)];
  const villainImg = document.createElement('img');
  villainImg.src = `/portraits/${villainFile}`;
  villainImg.alt = 'Villain';
  villainImg.style.cssText = `
    width:clamp(100px,22vw,180px);height:clamp(100px,22vw,180px);border-radius:50%;object-fit:cover;
    border:4px solid #ff4444;margin-bottom:12px;
    animation: villainBounce 0.5s ease-out;
  `;
  panel.appendChild(villainImg);

  // Villain monologue — pull from VillainTaunts config
  const villainKeys = ['bolo_tie', 'bow_tie', 'bishop'];
  const villainKey = villainKeys[Math.min(currentLevelIndex, villainKeys.length - 1)];
  const winLine = getWinTaunt(villainKey) ?? 'You lose!';
  const monologue = document.createElement('div');
  monologue.textContent = winLine;
  monologue.style.cssText = `
    font-size:clamp(22px,6vw,42px);font-weight:bold;color:#ff4444;font-style:italic;
    letter-spacing:2px;margin-bottom:16px;text-align:center;
    text-shadow:0 0 20px rgba(255,68,68,0.5);
    animation: villainBounce 0.5s ease-out;
  `;
  panel.appendChild(monologue);

  const scoreText = document.createElement('div');
  scoreText.textContent = `SCORE: ${(arena?.score ?? 0).toLocaleString()}`;
  scoreText.style.cssText = 'font-size:20px;margin-bottom:28px;color:#aaa;';
  panel.appendChild(scoreText);

  const retryBtn = document.createElement('button');
  retryBtn.textContent = 'PLAY AGAIN';
  retryBtn.style.cssText = `
    padding:14px 40px;background:rgba(17,24,34,0.9);border:2px solid #ff4444;
    color:#ff4444;font-size:18px;font-weight:bold;font-family:Rajdhani,sans-serif;
    cursor:pointer;border-radius:4px;
  `;
  retryBtn.addEventListener('click', () => {
    sceneManager.transition('title');
  });
  panel.appendChild(retryBtn);

  // Inject animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes villainBounce { from { transform:scale(1.3);opacity:0; } to { transform:scale(1);opacity:1; } }
  `;
  document.head.appendChild(style);

  // Play defeat + evil laugh sounds
  if (arena?.sound) {
    arena.sound.defeat();
    setTimeout(() => arena?.sound.evilLaugh(), 400);
  }
}

// ── Animation Loop ──

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();

  if (sceneManager.current === 'arena' && arena) {
    // Taunt callback — only spawn taunts now
    const tauntCb = (villainId: string, _event: string) => {
      const text = getSpawnTaunt(villainId);
      if (text && hud) hud.showTaunt(text);
    };
    updateArena(arena, keys, dt, now, tauntCb);

    // Update HUD
    if (hud) {
      const isThrusting = keys['KeyE'] || arena.touchControls.getInput().thrust > 0;
      const playerSpeed = arena.player.velocity.length();
      hud.update(arena.player, arena.enemies, arena.score, currentLevelIndex + 1, bundle.camera, isThrusting, playerSpeed);
      hud.updateTaunts(dt);
    }

    // Check win/lose — wait 2.5s for explosions to play out
    const TRANSITION_DELAY = 4000; // wait for 3s explosion to finish

    if (arena.victory && now - arena.victoryTime > TRANSITION_DELAY) {
      const hasNext = advanceLevel(
        arena.player.hull,
        arena.player.maxHull,
        arena.player.maxShield,
        arena.score - totalScore,
      );
      if (hasNext) {
        sceneManager.transition('levelIntro');
      } else {
        sceneManager.transition('highScore');
      }
    } else if (arena.gameOver && now - arena.gameOverTime > TRANSITION_DELAY) {
      sceneManager.transition('gameOver');
    }
  } else if (sceneManager.current === 'cinematic' && cinematic) {
    updateCinematic(cinematic, bundle.camera, dt);
    if (cinematic.done) {
      sceneManager.transition('arena');
    }
  } else if (sceneManager.current === 'title') {
    // Slowly rotate camera for cinematic idle
    const t = clock.elapsedTime * 0.1;
    bundle.camera.position.set(Math.sin(t) * 30, 10, Math.cos(t) * 30);
    bundle.camera.lookAt(0, 0, 0);
  }

  // Slow planet/moon rotation for realism + keep skybox centered on camera
  if (spaceEnv) {
    spaceEnv.planet.rotation.y += dt * 0.02;
    spaceEnv.moon.rotation.y += dt * 0.05;

    // Lock skybox + starfield + nebulae to camera so you never fly past the sky
    const camPos = bundle.camera.position;
    spaceEnv.skybox.position.copy(camPos);
    spaceEnv.stars.position.copy(camPos);
    spaceEnv.nebulae.position.copy(camPos);
  }

  bundle.composer.render();
}

// ── Bootstrap ──
if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}

export { bundle };
