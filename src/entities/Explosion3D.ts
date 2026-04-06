// ── Explosion3D — Screen-space DOM explosions ────────────
// Spawns at screen pixel coordinates or anchored to a 3D world position.
// World-anchored explosions re-project each fireball so the explosion
// stays locked to the death location even as the camera moves.

import * as THREE from 'three';

let cssInjected = false;
function injectCSS() {
  if (cssInjected) return;
  cssInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .explosion-fx {
      position: fixed;
      pointer-events: none !important;
      z-index: 9999;
      border-radius: 50%;
      transform: translate(-50%, -50%);
    }
    @keyframes boom1 {
      0% { transform: translate(-50%,-50%) scale(0.2); opacity: 1;
           background: radial-gradient(circle, #fff 0%, #ffffaa 20%, #ffcc00 40%, #ff6600 70%, transparent 100%);
           box-shadow: 0 0 80px 40px rgba(255,150,0,0.8), 0 0 160px 80px rgba(255,80,0,0.4); }
      15% { transform: translate(-50%,-50%) scale(1.0); opacity: 1;
           background: radial-gradient(circle, #ffee88 0%, #ffaa00 40%, #ff4400 70%, transparent 100%);
           box-shadow: 0 0 60px 30px rgba(255,120,0,0.6); }
      40% { transform: translate(-50%,-50%) scale(1.4); opacity: 0.8;
           background: radial-gradient(circle, #ff8844 0%, #ff3300 50%, #aa1100 80%, transparent 100%);
           box-shadow: 0 0 40px 20px rgba(255,80,0,0.4); }
      70% { transform: translate(-50%,-50%) scale(1.6); opacity: 0.4;
           background: radial-gradient(circle, #ff4422 0%, #aa2200 60%, transparent 100%);
           box-shadow: 0 0 20px 10px rgba(200,40,0,0.2); }
      100% { transform: translate(-50%,-50%) scale(2.0); opacity: 0;
           background: radial-gradient(circle, #882200 0%, transparent 70%); box-shadow: none; }
    }
    @keyframes boom2 {
      0% { transform: translate(-50%,-50%) scale(0.1); opacity: 0; }
      10% { transform: translate(-50%,-50%) scale(0.4); opacity: 1;
           background: radial-gradient(circle, #ffff88 0%, #ffaa00 50%, transparent 100%);
           box-shadow: 0 0 40px 20px rgba(255,200,0,0.5); }
      40% { transform: translate(-50%,-50%) scale(1.0); opacity: 0.7;
           background: radial-gradient(circle, #ffcc44 0%, #ff6600 60%, transparent 100%); }
      100% { transform: translate(-50%,-50%) scale(1.5); opacity: 0;
           background: radial-gradient(circle, #ff4400 0%, transparent 70%); box-shadow: none; }
    }
    @keyframes boom3 {
      0% { transform: translate(-50%,-50%) scale(0.3); opacity: 0; }
      20% { transform: translate(-50%,-50%) scale(0.6); opacity: 1;
           background: radial-gradient(circle, #fff 0%, #ff8800 40%, transparent 100%);
           box-shadow: 0 0 30px 15px rgba(255,100,0,0.4); }
      50% { transform: translate(-50%,-50%) scale(1.2); opacity: 0.6;
           background: radial-gradient(circle, #ffaa44 0%, #ff4400 50%, transparent 100%); }
      100% { transform: translate(-50%,-50%) scale(1.6); opacity: 0;
           background: radial-gradient(circle, #cc2200 0%, transparent 60%); box-shadow: none; }
    }
    @keyframes hit-flash {
      0% { transform: translate(-50%,-50%) scale(0.3); opacity: 1;
           background: radial-gradient(circle, #fff 0%, #ffcc00 50%, transparent 100%);
           box-shadow: 0 0 30px 15px rgba(255,200,0,0.6); }
      50% { transform: translate(-50%,-50%) scale(1.0); opacity: 0.6;
           background: radial-gradient(circle, #ffaa44 0%, #ff6600 60%, transparent 100%); }
      100% { transform: translate(-50%,-50%) scale(1.3); opacity: 0;
           background: radial-gradient(circle, #ff4400 0%, transparent 70%); box-shadow: none; }
    }
  `;
  document.head.appendChild(style);
}

export class ExplosionPool {
  private overlay: HTMLElement;

  constructor() {
    injectCSS();
    this.overlay = document.getElementById('ui-overlay') || document.body;
  }

  /** Spawn a single explosion at screen pixel coordinates */
  spawnAt(screenX: number, screenY: number, size: number, anim: string, duration: number): void {
    const el = document.createElement('div');
    el.className = 'explosion-fx';
    el.style.left = screenX + 'px';
    el.style.top = screenY + 'px';
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.display = 'block';
    el.style.animation = `${anim} ${duration}s ease-out forwards`;
    this.overlay.appendChild(el);

    // Auto-cleanup after animation
    setTimeout(() => el.remove(), duration * 1000 + 100);
  }

  /** Small impact flash */
  spawnHit(screenX: number, screenY: number): void {
    this.spawnAt(screenX, screenY, 50, 'hit-flash', 0.4);
  }

  /** Chaotic multi-stage death explosion — screen-space fallback */
  spawnDeath(screenX: number, screenY: number): void {
    this.spawnDeathAt(screenX, screenY);
  }

  /** World-anchored death explosion — re-projects from 3D each fireball so
   *  the explosion stays locked to the death point as the camera moves. */
  spawnDeathWorld(worldPos: THREE.Vector3, camera: THREE.PerspectiveCamera): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    const project = (): { x: number; y: number; visible: boolean } => {
      const proj = worldPos.clone().project(camera);
      return {
        x: (proj.x * 0.5 + 0.5) * w,
        y: (-proj.y * 0.5 + 0.5) * h,
        visible: proj.z < 1,
      };
    };

    const jit = () => (Math.random() - 0.5) * 80; // tighter scatter — stays near the ship
    const rSize = () => 100 + Math.random() * 200;
    const rDur = () => 1.5 + Math.random() * 2.0;
    const anims = ['boom1', 'boom2', 'boom3'];
    const rAnim = () => anims[Math.floor(Math.random() * anims.length)];

    // Immediate blast — project NOW
    const pos0 = project();
    if (pos0.visible) {
      this.spawnAt(pos0.x, pos0.y, 300, 'boom1', 2.5);
    }

    // Delayed fireballs — re-project at spawn time so they track the world point
    for (let i = 0; i < 10; i++) {
      const delay = 50 + Math.random() * 1500;
      setTimeout(() => {
        const pos = project();
        if (pos.visible) {
          this.spawnAt(pos.x + jit(), pos.y + jit(), rSize(), rAnim(), rDur());
        }
      }, delay);
    }
  }

  private spawnDeathAt(screenX: number, screenY: number): void {
    const jit = () => (Math.random() - 0.5) * 80;
    const rSize = () => 100 + Math.random() * 200;
    const rDur = () => 1.5 + Math.random() * 2.0;
    const anims = ['boom1', 'boom2', 'boom3'];
    const rAnim = () => anims[Math.floor(Math.random() * anims.length)];

    this.spawnAt(screenX, screenY, 300, 'boom1', 2.5);

    for (let i = 0; i < 10; i++) {
      const delay = 50 + Math.random() * 1500;
      setTimeout(() => {
        this.spawnAt(screenX + jit(), screenY + jit(), rSize(), rAnim(), rDur());
      }, delay);
    }
  }

  // No-op update — explosions are self-managing via CSS animation + setTimeout cleanup
  update(_dt: number): void {}
  setCamera(_camera: unknown): void {}
}
