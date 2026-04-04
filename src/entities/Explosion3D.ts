// ── Explosion3D — DOM-based explosions overlaid on canvas ─
// Uses CSS-animated divs projected to screen space.
// Guaranteed visible — it's a DOM element on top of the 3D canvas.

import * as THREE from 'three';

const MAX_EXPLOSIONS = 15;

interface ExplosionSlot {
  active: boolean;
  elapsed: number;
  duration: number;
  worldPos: THREE.Vector3;
  el: HTMLDivElement;
}

// Inject explosion CSS once
let cssInjected = false;
function injectCSS() {
  if (cssInjected) return;
  cssInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .explosion-fx {
      position: fixed;
      pointer-events: none !important;
      z-index: 50;
      border-radius: 50%;
      transform: translate(-50%, -50%);
    }
    @keyframes explode {
      0% { transform: translate(-50%,-50%) scale(0.2); opacity: 1; background: radial-gradient(circle, #fff 0%, #ffffaa 20%, #ffcc00 40%, #ff6600 60%, #ff2200 80%, transparent 100%); box-shadow: 0 0 60px 30px rgba(255,150,0,0.8), 0 0 120px 60px rgba(255,80,0,0.4); }
      10% { transform: translate(-50%,-50%) scale(0.8); opacity: 1; background: radial-gradient(circle, #fff 0%, #ffee88 25%, #ffaa00 50%, #ff4400 75%, transparent 100%); box-shadow: 0 0 80px 40px rgba(255,150,0,0.7), 0 0 160px 80px rgba(255,60,0,0.3); }
      25% { transform: translate(-50%,-50%) scale(1.2); opacity: 1; background: radial-gradient(circle, #ffee88 0%, #ff8800 35%, #ff3300 65%, #aa1100 85%, transparent 100%); box-shadow: 0 0 60px 30px rgba(255,100,0,0.5); }
      50% { transform: translate(-50%,-50%) scale(1.5); opacity: 0.7; background: radial-gradient(circle, #ff8844 0%, #ff4400 40%, #cc2200 70%, transparent 100%); box-shadow: 0 0 40px 20px rgba(255,60,0,0.3); }
      75% { transform: translate(-50%,-50%) scale(1.8); opacity: 0.4; background: radial-gradient(circle, #ff4422 0%, #aa2200 50%, #441100 80%, transparent 100%); box-shadow: 0 0 20px 10px rgba(200,40,0,0.2); }
      100% { transform: translate(-50%,-50%) scale(2.0); opacity: 0; background: radial-gradient(circle, #882200 0%, #331100 60%, transparent 100%); box-shadow: none; }
    }
    @keyframes explode2 {
      0% { transform: translate(-50%,-50%) scale(0.1); opacity: 0.9; background: radial-gradient(circle, #ffff88 0%, #ffaa00 50%, transparent 100%); }
      30% { transform: translate(-50%,-50%) scale(1.0); opacity: 0.8; background: radial-gradient(circle, #ffcc44 0%, #ff6600 50%, transparent 100%); }
      100% { transform: translate(-50%,-50%) scale(1.5); opacity: 0; background: radial-gradient(circle, #ff4400 0%, transparent 70%); }
    }
    @keyframes explode3 {
      0% { transform: translate(-50%,-50%) scale(0.3); opacity: 0; }
      15% { transform: translate(-50%,-50%) scale(0.5); opacity: 1; background: radial-gradient(circle, #fff 0%, #ff8800 40%, transparent 100%); }
      40% { transform: translate(-50%,-50%) scale(1.2); opacity: 0.7; background: radial-gradient(circle, #ffaa44 0%, #ff4400 50%, transparent 100%); }
      100% { transform: translate(-50%,-50%) scale(1.8); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

export class ExplosionPool {
  private slots: ExplosionSlot[] = [];
  private camera: THREE.PerspectiveCamera | null = null;

  constructor(_scene: THREE.Scene) {
    injectCSS();

    // Append to ui-overlay — same layer as HUD, guaranteed visible over canvas
    const overlay = document.getElementById('ui-overlay') || document.body;

    for (let i = 0; i < MAX_EXPLOSIONS; i++) {
      const el = document.createElement('div');
      el.className = 'explosion-fx';
      el.style.display = 'none';
      overlay.appendChild(el);

      this.slots.push({
        active: false,
        elapsed: 0,
        duration: 2,
        worldPos: new THREE.Vector3(),
        el,
      });
    }
  }

  setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
  }

  spawn(position: THREE.Vector3, size = 80, animName = 'explode', duration = 2.5): void {
    const slot = this.slots.find(s => !s.active);
    if (!slot) return;

    slot.active = true;
    slot.elapsed = 0;
    slot.duration = duration;
    slot.worldPos.copy(position);

    // Project to screen immediately
    if (this.camera) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const projected = position.clone().project(this.camera);
      const sx = (projected.x * 0.5 + 0.5) * w;
      const sy = (-projected.y * 0.5 + 0.5) * h;
      slot.el.style.left = sx + 'px';
      slot.el.style.top = sy + 'px';
    }

    slot.el.style.width = size + 'px';
    slot.el.style.height = size + 'px';
    slot.el.style.display = 'block';
    slot.el.style.animation = 'none';
    slot.el.offsetHeight; // force reflow
    slot.el.style.animation = `${animName} ${duration}s ease-out forwards`;
  }

  /** Spawn a spectacular multi-stage chain explosion for ship death */
  spawnDeathExplosion(position: THREE.Vector3): void {
    // Stage 1: Initial white-hot flash (immediate)
    this.spawn(position, 250, 'explode', 3.0);

    // Stage 2: Secondary fireballs with slight delays and offsets
    setTimeout(() => {
      const off1 = position.clone().add(new THREE.Vector3(3, 2, -1));
      this.spawn(off1, 180, 'explode2', 2.5);
    }, 200);

    setTimeout(() => {
      const off2 = position.clone().add(new THREE.Vector3(-4, -1, 2));
      this.spawn(off2, 200, 'explode', 2.8);
    }, 400);

    setTimeout(() => {
      const off3 = position.clone().add(new THREE.Vector3(2, -3, -2));
      this.spawn(off3, 160, 'explode3', 2.2);
    }, 600);

    // Stage 3: Final bloom
    setTimeout(() => {
      this.spawn(position, 300, 'explode2', 2.0);
    }, 900);

    // Stage 4: Lingering embers
    setTimeout(() => {
      const off4 = position.clone().add(new THREE.Vector3(-2, 4, 1));
      this.spawn(off4, 120, 'explode3', 1.8);
    }, 1200);

    setTimeout(() => {
      const off5 = position.clone().add(new THREE.Vector3(5, -2, -3));
      this.spawn(off5, 140, 'explode3', 1.5);
    }, 1500);
  }

  update(dt: number): void {
    if (!this.camera) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    for (const slot of this.slots) {
      if (!slot.active) continue;

      slot.elapsed += dt;
      if (slot.elapsed >= slot.duration) {
        slot.active = false;
        slot.el.style.display = 'none';
        slot.el.style.animation = '';
        continue;
      }

      // Project world position to screen
      const projected = slot.worldPos.clone().project(this.camera);
      const behind = projected.z > 1;

      if (behind) {
        slot.el.style.display = 'none';
        continue;
      }

      const sx = (projected.x * 0.5 + 0.5) * w;
      const sy = (-projected.y * 0.5 + 0.5) * h;

      slot.el.style.display = 'block';
      slot.el.style.left = sx + 'px';
      slot.el.style.top = sy + 'px';
    }
  }
}
