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
    /* Primary blast — bright white-hot core that quickly darkens to smoke */
    @keyframes boom1 {
      0% { transform: translate(-50%,-50%) scale(0.1); opacity: 1;
           background: radial-gradient(circle, #fff 0%, #fff8cc 15%, #ffaa00 35%, transparent 60%);
           box-shadow: 0 0 40px 20px rgba(255,200,100,0.7); }
      8% { transform: translate(-50%,-50%) scale(0.8); opacity: 1;
           background: radial-gradient(circle, #ffee88 0%, #ff8800 30%, #cc3300 55%, transparent 75%);
           box-shadow: 0 0 50px 25px rgba(255,100,0,0.5); }
      25% { transform: translate(-50%,-50%) scale(1.2); opacity: 0.85;
           background: radial-gradient(circle, #ff6622 0%, #cc2200 35%, #441100 60%, rgba(30,20,15,0.4) 80%, transparent 100%);
           box-shadow: 0 0 25px 12px rgba(200,60,0,0.3); }
      55% { transform: translate(-50%,-50%) scale(1.5); opacity: 0.5;
           background: radial-gradient(circle, #993300 0%, #331100 40%, rgba(20,15,10,0.3) 70%, transparent 100%);
           box-shadow: none; }
      100% { transform: translate(-50%,-50%) scale(1.8); opacity: 0;
           background: radial-gradient(circle, rgba(40,20,10,0.2) 0%, transparent 50%); }
    }
    /* Secondary fireball — delayed, more orange, billowing smoke */
    @keyframes boom2 {
      0% { transform: translate(-50%,-50%) scale(0.1); opacity: 0; }
      8% { transform: translate(-50%,-50%) scale(0.3); opacity: 0.9;
           background: radial-gradient(circle, #ffcc44 0%, #ff6600 40%, transparent 70%);
           box-shadow: 0 0 30px 15px rgba(255,150,0,0.4); }
      30% { transform: translate(-50%,-50%) scale(0.8); opacity: 0.7;
           background: radial-gradient(circle, #ff8833 0%, #aa2200 45%, rgba(30,15,5,0.3) 75%, transparent 100%); }
      60% { transform: translate(-50%,-50%) scale(1.1); opacity: 0.35;
           background: radial-gradient(circle, #662200 0%, rgba(25,15,10,0.25) 50%, transparent 80%); }
      100% { transform: translate(-50%,-50%) scale(1.3); opacity: 0;
           background: radial-gradient(circle, rgba(30,15,5,0.1) 0%, transparent 50%); }
    }
    /* Ember burst — small bright sparks that scatter outward */
    @keyframes boom3 {
      0% { transform: translate(-50%,-50%) scale(0.15); opacity: 0; }
      12% { transform: translate(-50%,-50%) scale(0.5); opacity: 1;
           background: radial-gradient(circle, #fff 0%, #ffaa44 30%, transparent 55%);
           box-shadow: 0 0 15px 8px rgba(255,180,50,0.5); }
      40% { transform: translate(-50%,-50%) scale(0.9); opacity: 0.6;
           background: radial-gradient(circle, #ffaa44 0%, #cc4400 40%, transparent 65%);
           box-shadow: 0 0 8px 4px rgba(255,80,0,0.2); }
      100% { transform: translate(-50%,-50%) scale(1.2); opacity: 0;
           background: radial-gradient(circle, #882200 0%, transparent 40%); box-shadow: none; }
    }
    /* Hit spark — quick bright flash, no lingering */
    @keyframes hit-flash {
      0% { transform: translate(-50%,-50%) scale(0.2); opacity: 1;
           background: radial-gradient(circle, #fff 0%, #ffdd66 40%, transparent 65%);
           box-shadow: 0 0 15px 8px rgba(255,220,100,0.5); }
      40% { transform: translate(-50%,-50%) scale(0.7); opacity: 0.5;
           background: radial-gradient(circle, #ffaa44 0%, #ff6600 50%, transparent 70%); }
      100% { transform: translate(-50%,-50%) scale(0.9); opacity: 0;
           background: radial-gradient(circle, #cc4400 0%, transparent 50%); box-shadow: none; }
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

    const jit = () => (Math.random() - 0.5) * 50; // tight scatter
    const rDur = () => 1.2 + Math.random() * 1.5;
    const anims = ['boom1', 'boom2', 'boom3'];
    const rAnim = () => anims[Math.floor(Math.random() * anims.length)];

    // Immediate core blast — bright white-hot, medium size
    const pos0 = project();
    if (pos0.visible) {
      this.spawnAt(pos0.x, pos0.y, 180, 'boom1', 2.0);
      // Secondary fireball slightly offset
      this.spawnAt(pos0.x + jit() * 0.5, pos0.y + jit() * 0.5, 120, 'boom2', 1.8);
    }

    // Delayed fireballs — re-project at spawn time so they track the world point
    for (let i = 0; i < 8; i++) {
      const delay = 30 + Math.random() * 1000;
      const size = 60 + Math.random() * 100; // smaller, more varied
      setTimeout(() => {
        const pos = project();
        if (pos.visible) {
          this.spawnAt(pos.x + jit(), pos.y + jit(), size, rAnim(), rDur());
        }
      }, delay);
    }
  }

  private spawnDeathAt(screenX: number, screenY: number): void {
    const jit = () => (Math.random() - 0.5) * 50;
    const rDur = () => 1.2 + Math.random() * 1.5;
    const anims = ['boom1', 'boom2', 'boom3'];
    const rAnim = () => anims[Math.floor(Math.random() * anims.length)];

    this.spawnAt(screenX, screenY, 180, 'boom1', 2.0);
    this.spawnAt(screenX + jit() * 0.5, screenY + jit() * 0.5, 120, 'boom2', 1.8);

    for (let i = 0; i < 8; i++) {
      const delay = 30 + Math.random() * 1000;
      const size = 60 + Math.random() * 100;
      setTimeout(() => {
        this.spawnAt(screenX + jit(), screenY + jit(), size, rAnim(), rDur());
      }, delay);
    }
  }

  // No-op update — explosions are self-managing via CSS animation + setTimeout cleanup
  update(_dt: number): void {}
  setCamera(_camera: unknown): void {}
}
