// ── OH-YUM BLASTER 3D — Main Entry Point ────────────────
// Three.js renderer, scene management, animation loop.

import * as THREE from 'three';
import { createRenderer, handleRendererResize, type RendererBundle } from './renderer/SetupRenderer';
import { createSpaceEnvironment, type SpaceEnvironment } from './renderer/Environment';
import { createPlayerShipGeometry, createEnemyShipGeometry } from './ships/ShipGeometry';
import { createPlayerMaterials, createEnemyMaterials, applyMaterials } from './ships/ShipMaterials';
import { Ship3D } from './entities/Ship3D';
import { CockpitCamera } from './camera/CockpitCamera';
import { SHIP, PHYSICS } from './config';

// ── Globals ──
let bundle: RendererBundle;
let env: SpaceEnvironment;
let clock: THREE.Clock;
let player: Ship3D;
let enemy: Ship3D;
let cockpitCam: CockpitCamera;

// Input state
const keys: Record<string, boolean> = {};

function init() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error('Missing #game-canvas element');

  // ── Renderer ──
  bundle = createRenderer(canvas);

  // ── Space environment ──
  env = createSpaceEnvironment(bundle.scene, bundle.renderer, bundle.camera);

  // ── Player ship ──
  const playerGeo = createPlayerShipGeometry();
  const playerMats = createPlayerMaterials(0x88aacc);
  applyMaterials(playerGeo, playerMats);
  playerGeo.position.set(0, 0, 0);
  bundle.scene.add(playerGeo);

  player = new Ship3D({
    group: playerGeo,
    maxHull: SHIP.PLAYER_HULL,
    maxShield: SHIP.PLAYER_SHIELD,
    speedMult: 1.0,
    rotationMult: 1.0,
    isPlayer: true,
  });

  // ── Enemy ship (stationary target for now) ──
  const enemyGeo = createEnemyShipGeometry();
  const enemyMats = createEnemyMaterials();
  applyMaterials(enemyGeo, enemyMats);
  enemyGeo.position.set(0, 0, 80);
  bundle.scene.add(enemyGeo);

  enemy = new Ship3D({
    group: enemyGeo,
    maxHull: 60,
    maxShield: 0,
    speedMult: 0.5,
    rotationMult: 0.5,
    isPlayer: false,
  });

  // ── Cockpit camera ──
  cockpitCam = new CockpitCamera(bundle.camera);

  // Show crosshair
  const crosshair = document.getElementById('crosshair');
  if (crosshair) crosshair.style.display = 'block';

  // ── Input ──
  window.addEventListener('keydown', (e) => { keys[e.code] = true; });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  // ── Clock ──
  clock = new THREE.Clock();

  // ── Resize ──
  const onResize = () => handleRendererResize(bundle);
  window.addEventListener('resize', onResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onResize);
  }

  // ── Start loop ──
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05); // cap dt to prevent spiral

  // ── Read input ──
  let yawInput = 0;
  let pitchInput = 0;
  let thrustInput = 0;

  if (keys['ArrowLeft'] || keys['KeyA']) yawInput = -1;
  if (keys['ArrowRight'] || keys['KeyD']) yawInput = 1;
  if (keys['ArrowUp'] || keys['KeyW']) thrustInput = 1;
  if (keys['ArrowDown'] || keys['KeyS']) thrustInput = -1;
  if (keys['KeyQ']) pitchInput = 1;
  if (keys['KeyE']) pitchInput = -1;

  // ── Apply rotation ──
  const rotSpeed = PHYSICS.ROTATION_SPEED * player.rotationMult;
  const yawQuat = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0), -yawInput * rotSpeed * dt
  );
  const pitchQuat = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0), pitchInput * rotSpeed * 0.7 * dt
  );
  player.group.quaternion.multiply(yawQuat).multiply(pitchQuat);

  // ── Apply thrust ──
  if (thrustInput !== 0) {
    const forward = player.getForward();
    const thrust = PHYSICS.THRUST * player.speedMult * thrustInput;
    player.velocity.addScaledVector(forward, thrust * dt);
  }

  // ── Drag (exponential decay) ──
  const dragFactor = Math.exp(-Math.log(2) / PHYSICS.DRAG_HALF_LIFE * dt);
  player.velocity.multiplyScalar(dragFactor);

  // ── Clamp velocity ──
  if (player.velocity.length() > PHYSICS.MAX_VELOCITY) {
    player.velocity.setLength(PHYSICS.MAX_VELOCITY);
  }

  // ── Move ──
  player.position.addScaledVector(player.velocity, dt);

  // ── Shield regen ──
  player.updateShieldRegen(dt);

  // ── Camera ──
  cockpitCam.update(player, dt, yawInput);

  // ── Render ──
  bundle.composer.render();
}

// ── Bootstrap ──
if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}

export { bundle, env };
