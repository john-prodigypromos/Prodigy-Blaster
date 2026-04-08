// ── Per-Level Environment Loader ─────────────────────────
// Spawns level-specific environment objects (asteroids, fog,
// black hole) into the scene. Returns an update function for
// per-frame effects and a cleanup function.

import * as THREE from 'three';
import { Ship3D } from '../entities/Ship3D';
import type { BoltPool } from '../entities/Bolt3D';
import { ExplosionPool } from '../entities/Explosion3D';

export interface LevelEnvironment {
  /** Per-frame update for environment effects. */
  update(dt: number, now: number, player: Ship3D, enemies: Ship3D[], boltPool?: BoltPool, camera?: THREE.PerspectiveCamera, explosions?: ExplosionPool): void;
  /** Remove all environment objects from the scene. */
  cleanup(): void;
}

// ── Level 1: Asteroid Belt ──────────────────────────────

interface Asteroid {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVel: THREE.Vector3;
  radius: number;
  hp: number;
  alive: boolean;
}

export function createAsteroidBelt(scene: THREE.Scene): LevelEnvironment {
  const asteroids: Asteroid[] = [];
  const count = 12 + Math.floor(Math.random() * 6); // 12-17

  // Simple pseudo-noise for consistent rock displacement
  function hashNoise(x: number, y: number, z: number): number {
    let n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    n = n - Math.floor(n);
    return n * 2 - 1; // -1 to 1
  }

  for (let i = 0; i < count; i++) {
    // Random size: small (4-7), medium (10-16), large (18-30)
    const sizeRoll = Math.random();
    let radius: number;
    if (sizeRoll < 0.45) radius = 4 + Math.random() * 3;
    else if (sizeRoll < 0.8) radius = 10 + Math.random() * 6;
    else radius = 18 + Math.random() * 12;

    // Higher subdivision for more detailed rock surfaces
    const detail = radius > 14 ? 3 : radius > 7 ? 2 : 1;
    const geo = new THREE.IcosahedronGeometry(radius, detail);
    const posAttr = geo.attributes.position;

    // Multi-octave noise displacement for craggy, irregular rock shapes
    for (let v = 0; v < posAttr.count; v++) {
      const x = posAttr.getX(v);
      const y = posAttr.getY(v);
      const z = posAttr.getZ(v);
      const len = Math.sqrt(x * x + y * y + z * z);
      if (len < 0.001) continue;
      const nx = x / len, ny = y / len, nz = z / len;

      // Large-scale deformation (lumpy shape)
      const big = hashNoise(nx * 2 + i, ny * 2, nz * 2) * 0.25;
      // Medium crags
      const mid = hashNoise(nx * 5 + i * 3, ny * 5, nz * 5) * 0.12;
      // Fine surface roughness
      const fine = hashNoise(nx * 12 + i * 7, ny * 12, nz * 12) * 0.06;
      // Crater-like dimples (some vertices pushed inward)
      const crater = hashNoise(nx * 8 + i, ny * 8 + i, nz * 8) > 0.6 ? -0.15 : 0;

      const displacement = 1 + big + mid + fine + crater;
      posAttr.setXYZ(v, nx * radius * displacement, ny * radius * displacement, nz * radius * displacement);
    }
    geo.computeVertexNormals();

    // Per-asteroid material with color variation
    const colorVar = Math.random();
    let baseColor: number;
    if (colorVar < 0.3) baseColor = 0x3d2b1a;       // dark brown
    else if (colorVar < 0.6) baseColor = 0x554433;   // warm brown
    else if (colorVar < 0.8) baseColor = 0x444040;   // grey rock
    else baseColor = 0x2a2520;                         // near-black iron

    const mat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.85 + Math.random() * 0.15,
      metalness: 0.05 + Math.random() * 0.15,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geo, mat);

    // Scatter within a ring around the player spawn area (avoid center)
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 500; // 80-580 units from origin
    const elevation = (Math.random() - 0.5) * 120;
    mesh.position.set(
      Math.cos(angle) * dist,
      elevation,
      Math.sin(angle) * dist,
    );

    // Random rotation
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

    scene.add(mesh);

    asteroids.push({
      mesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 1,
        (Math.random() - 0.5) * 3,
      ),
      angularVel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
      ),
      radius,
      hp: Math.round(radius * 4), // bigger asteroids take more hits
      alive: true,
    });
  }

  const _tmpDiff = new THREE.Vector3();

  function update(dt: number, _now: number, player: Ship3D, enemies: Ship3D[], boltPool?: BoltPool, camera?: THREE.PerspectiveCamera, explosions?: ExplosionPool): void {
    for (const ast of asteroids) {
      if (!ast.alive) continue;

      // Slow drift
      ast.mesh.position.addScaledVector(ast.velocity, dt);
      ast.mesh.rotation.x += ast.angularVel.x * dt;
      ast.mesh.rotation.y += ast.angularVel.y * dt;
      ast.mesh.rotation.z += ast.angularVel.z * dt;

      // Collision with player
      if (player.alive) {
        _tmpDiff.subVectors(player.position, ast.mesh.position);
        const dist = _tmpDiff.length();
        const minDist = ast.radius + 20;
        if (dist < minDist) {
          _tmpDiff.normalize();
          player.position.copy(ast.mesh.position).addScaledVector(_tmpDiff, minDist);
          const dot = player.velocity.dot(_tmpDiff);
          if (dot < 0) {
            player.velocity.addScaledVector(_tmpDiff, -dot * 1.5);
          }
          player.applyDamage(3, performance.now());
        }
      }

      // Collision with enemies
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        _tmpDiff.subVectors(enemy.position, ast.mesh.position);
        const dist = _tmpDiff.length();
        const minDist = ast.radius + 20;
        if (dist < minDist) {
          _tmpDiff.normalize();
          enemy.position.copy(ast.mesh.position).addScaledVector(_tmpDiff, minDist);
          enemy.applyDamage(3, performance.now());
        }
      }

      // Bolt-asteroid collisions — asteroids take damage from lasers
      if (boltPool) {
        for (const bolt of boltPool.getActive()) {
          if (!bolt.active) continue;
          _tmpDiff.subVectors(bolt.mesh.position, ast.mesh.position);
          const dist = _tmpDiff.length();
          if (dist < ast.radius) {
            ast.hp -= bolt.damage;
            boltPool.deactivate(bolt);

            if (ast.hp <= 0) {
              // Asteroid destroyed — boom!
              ast.alive = false;
              ast.mesh.visible = false;
              scene.remove(ast.mesh);

              if (explosions && camera) {
                explosions.spawnDeathWorld(ast.mesh.position, camera);
              }
            } else {
              // Visual feedback — briefly brighten on hit
              const mat = ast.mesh.material as THREE.MeshStandardMaterial;
              mat.emissive.setHex(0xff4400);
              mat.emissiveIntensity = 0.5;
              setTimeout(() => {
                mat.emissive.setHex(0x000000);
                mat.emissiveIntensity = 0;
              }, 100);
            }
          }
        }
      }
    }
  }

  function cleanup(): void {
    for (const ast of asteroids) {
      scene.remove(ast.mesh);
      ast.mesh.geometry.dispose();
    }
  }

  return { update, cleanup };
}

// ── Level 2: Nebula Fog ─────────────────────────────────

export function createNebulaFog(scene: THREE.Scene): LevelEnvironment {
  // Dense fog sphere
  const fogGeo = new THREE.SphereGeometry(800, 32, 24);
  const fogMat = new THREE.MeshBasicMaterial({
    color: 0x1a3344,
    transparent: true,
    opacity: 0.04,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const fogSphere = new THREE.Mesh(fogGeo, fogMat);
  scene.add(fogSphere);

  // Inner fog layers for depth
  const innerFogGeo = new THREE.SphereGeometry(400, 24, 16);
  const innerFogMat = new THREE.MeshBasicMaterial({
    color: 0x2a4455,
    transparent: true,
    opacity: 0.03,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const innerFog = new THREE.Mesh(innerFogGeo, innerFogMat);
  scene.add(innerFog);

  // No scene.fog — it kills the starfield and skybox. Use visual-only atmosphere instead.

  // Reduced ambient
  const dimLight = new THREE.AmbientLight(0x112233, 0.3);
  scene.add(dimLight);

  // Lightning flash light (off by default)
  const lightningLight = new THREE.DirectionalLight(0xffffff, 0);
  lightningLight.position.set(0, 200, 0);
  scene.add(lightningLight);

  let nextLightning = 8 + Math.random() * 7; // 8-15 seconds
  let lightningTimer = 0;
  let flashTimer = 0;
  let flashing = false;

  function update(dt: number): void {
    lightningTimer += dt;

    if (!flashing && lightningTimer >= nextLightning) {
      // Trigger lightning
      flashing = true;
      flashTimer = 0;
      lightningLight.intensity = 5;
      lightningTimer = 0;
      nextLightning = 8 + Math.random() * 7;
    }

    if (flashing) {
      flashTimer += dt;
      // Quick flash then fade
      if (flashTimer < 0.05) {
        lightningLight.intensity = 5;
      } else if (flashTimer < 0.15) {
        lightningLight.intensity = 2;
      } else if (flashTimer < 0.2) {
        lightningLight.intensity = 4; // secondary flash
      } else {
        lightningLight.intensity = Math.max(0, lightningLight.intensity - dt * 15);
        if (lightningLight.intensity <= 0) {
          flashing = false;
        }
      }
    }

    // Slowly drift fog center to follow player loosely
    fogSphere.position.lerp(new THREE.Vector3(0, 0, 0), dt * 0.1);
    innerFog.position.copy(fogSphere.position);
  }

  function cleanup(): void {
    scene.remove(fogSphere);
    scene.remove(innerFog);
    scene.remove(dimLight);
    scene.remove(lightningLight);
    fogGeo.dispose();
    innerFogGeo.dispose();
    fogMat.dispose();
    innerFogMat.dispose();
  }

  return { update, cleanup };
}

// ── Level 3: Black Hole ─────────────────────────────────
// Fiery fantastical black hole — intense orange/yellow swirling
// accretion disk with turbulent filaments, radial sparks, thick
// spiral gas arms, volumetric glow, and real gravity pull.

/** Black hole world position — exported so AI behaviors can reference it. */
export const BLACK_HOLE_POS = new THREE.Vector3(600, -80, -400);

// ── GLSL snippets for the accretion disk shader ──

const DISK_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const DISK_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uHotSpotAngle;
  varying vec2 vUv;

  // --- Simplex-style hash noise ---
  vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
  }
  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // --- Value noise ---
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // --- Fractal Brownian Motion (turbulent organic gas) ---
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 6; i++) {
      v += a * vnoise(p);
      p = rot * p * 2.0;
      a *= 0.5;
    }
    return v;
  }

  // --- Ridged noise (bright filament structures) ---
  float ridged(vec2 p) {
    return 1.0 - abs(vnoise(p) * 2.0 - 1.0);
  }
  float ridgedFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 5; i++) {
      v += a * ridged(p);
      p = rot * p * 2.1;
      a *= 0.5;
    }
    return v;
  }

  // --- Fire color ramp ---
  vec3 fireColor(float t) {
    // black → deep red → orange → yellow → white-hot
    vec3 c0 = vec3(0.05, 0.0, 0.0);   // black/very dark red
    vec3 c1 = vec3(0.6, 0.1, 0.0);    // deep red
    vec3 c2 = vec3(1.0, 0.4, 0.0);    // orange
    vec3 c3 = vec3(1.0, 0.75, 0.2);   // yellow-orange
    vec3 c4 = vec3(1.0, 0.95, 0.7);   // white-hot

    if (t < 0.2) return mix(c0, c1, t / 0.2);
    if (t < 0.4) return mix(c1, c2, (t - 0.2) / 0.2);
    if (t < 0.65) return mix(c2, c3, (t - 0.4) / 0.25);
    return mix(c3, c4, clamp((t - 0.65) / 0.35, 0.0, 1.0));
  }

  void main() {
    // Convert UV to polar: center of disk at (0.5, 0.5)
    vec2 centered = vUv - 0.5;
    float dist = length(centered) * 2.0; // 0 at center, 1 at edge
    float angle = atan(centered.y, centered.x);

    // Inner/outer cutoff
    float innerR = 0.18;  // black void radius
    float outerR = 0.95;  // outer fade
    if (dist < innerR || dist > outerR) discard;

    // Normalized radial position: 0 at inner edge, 1 at outer
    float radialT = (dist - innerR) / (outerR - innerR);

    // Spiral UV distortion — makes the gas swirl
    float spiralWind = 3.0; // how tightly wound
    float spiralAngle = angle + radialT * spiralWind + uTime * 0.15;

    // Sample coordinates for noise
    vec2 noiseUV = vec2(spiralAngle * 1.2, radialT * 4.0);

    // Base turbulence (large-scale gas structure)
    float turb = fbm(noiseUV * 3.0 + uTime * 0.08);

    // Bright filaments (ridged noise for tendril structures)
    float filaments = ridgedFbm(noiseUV * 4.0 + vec2(uTime * 0.05, uTime * 0.12));

    // Combine: turbulence base + bright filament overlay
    float intensity = turb * 0.6 + filaments * 0.55;

    // Radial brightness: hotter near inner edge, cooler at outer
    float radialBrightness = 1.0 - radialT * 0.7;
    intensity *= radialBrightness;

    // Hot spot — concentrated brightness at one angular position
    float hotSpotDist = 1.0 - smoothstep(0.0, 1.8,
      abs(mod(angle - uHotSpotAngle + 3.14159, 6.28318) - 3.14159));
    float hotSpotRadial = smoothstep(0.0, 0.5, radialT) * smoothstep(0.8, 0.3, radialT);
    intensity += hotSpotDist * hotSpotRadial * 0.5;

    // Extra inner-edge brightness (white-hot ring hugging the void)
    float innerGlow = smoothstep(0.15, 0.0, radialT) * 1.2;
    intensity += innerGlow;

    // Clamp and apply fire color ramp
    intensity = clamp(intensity, 0.0, 1.5);
    vec3 color = fireColor(intensity);

    // Boost bright areas for bloom to catch
    color *= 1.0 + intensity * 0.8;

    // Alpha: fade at inner edge (just past void), fade at outer edge
    float alphaInner = smoothstep(0.0, 0.06, radialT);
    float alphaOuter = 1.0 - smoothstep(0.75, 1.0, radialT);
    float alpha = alphaInner * alphaOuter * clamp(intensity * 1.5, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;

// Helper: generate a canvas texture for a radial glow sprite
function makeGlowTexture(
  size: number,
  stops: Array<{ pos: number; color: string }>,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  for (const s of stops) grad.addColorStop(s.pos, s.color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export function createBlackHole(scene: THREE.Scene): LevelEnvironment {
  const group = new THREE.Group();
  group.position.copy(BLACK_HOLE_POS);
  const disposables: Array<{ dispose(): void }> = [];

  const DISK_TILT = Math.PI * 0.42;

  // ── 1. Singularity sphere (deep black void) ──
  const holeGeo = new THREE.SphereGeometry(60, 48, 48);
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const holeMesh = new THREE.Mesh(holeGeo, holeMat);
  group.add(holeMesh);
  disposables.push(holeGeo, holeMat);

  // ── 2. Outer volumetric glow (large warm orange wash) ──
  const outerGlowTex = makeGlowTexture(512, [
    { pos: 0, color: 'rgba(255, 160, 40, 0.35)' },
    { pos: 0.12, color: 'rgba(255, 120, 20, 0.25)' },
    { pos: 0.3, color: 'rgba(200, 70, 5, 0.12)' },
    { pos: 0.55, color: 'rgba(120, 30, 0, 0.05)' },
    { pos: 0.8, color: 'rgba(40, 8, 0, 0.02)' },
    { pos: 1, color: 'rgba(0, 0, 0, 0)' },
  ]);
  const outerGlowMat = new THREE.SpriteMaterial({
    map: outerGlowTex, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const outerGlow = new THREE.Sprite(outerGlowMat);
  outerGlow.scale.set(1000, 1000, 1);
  group.add(outerGlow);
  disposables.push(outerGlowTex, outerGlowMat);

  // ── 3. Inner intense glow (white-hot core halo) ──
  const innerGlowTex = makeGlowTexture(512, [
    { pos: 0, color: 'rgba(255, 240, 180, 0.6)' },
    { pos: 0.08, color: 'rgba(255, 200, 80, 0.5)' },
    { pos: 0.2, color: 'rgba(255, 140, 30, 0.3)' },
    { pos: 0.4, color: 'rgba(255, 80, 5, 0.12)' },
    { pos: 0.7, color: 'rgba(120, 30, 0, 0.03)' },
    { pos: 1, color: 'rgba(0, 0, 0, 0)' },
  ]);
  const innerGlowMat = new THREE.SpriteMaterial({
    map: innerGlowTex, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const innerGlow = new THREE.Sprite(innerGlowMat);
  innerGlow.scale.set(500, 500, 1);
  group.add(innerGlow);
  disposables.push(innerGlowTex, innerGlowMat);

  // ── 4. Shader accretion disk (the main fiery swirl) ──
  const diskUniforms = {
    uTime: { value: 0.0 },
    uHotSpotAngle: { value: -0.8 }, // lower-right hot spot
  };
  const diskGeo = new THREE.PlaneGeometry(500, 500, 1, 1);
  const diskMat = new THREE.ShaderMaterial({
    uniforms: diskUniforms,
    vertexShader: DISK_VERTEX,
    fragmentShader: DISK_FRAGMENT,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const diskMesh = new THREE.Mesh(diskGeo, diskMat);
  diskMesh.rotation.x = DISK_TILT;
  group.add(diskMesh);
  disposables.push(diskGeo, diskMat);

  // ── 5. Second disk layer (offset tilt for volumetric depth) ──
  const disk2Geo = new THREE.PlaneGeometry(480, 480, 1, 1);
  const disk2Mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: diskUniforms.uTime, // share time uniform
      uHotSpotAngle: { value: -0.4 }, // slightly different hot spot
    },
    vertexShader: DISK_VERTEX,
    fragmentShader: DISK_FRAGMENT,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const disk2Mesh = new THREE.Mesh(disk2Geo, disk2Mat);
  disk2Mesh.rotation.x = DISK_TILT + 0.12;
  disk2Mesh.rotation.z = 0.25;
  group.add(disk2Mesh);
  disposables.push(disk2Geo, disk2Mat);

  // ── 6. Thick spiral gas filament tubes (bright orange tendrils) ──
  const filamentGroup = new THREE.Group();
  filamentGroup.rotation.x = DISK_TILT;
  const FILAMENT_COUNT = 14;
  for (let w = 0; w < FILAMENT_COUNT; w++) {
    const startAngle = (w / FILAMENT_COUNT) * Math.PI * 2 + Math.random() * 0.4;
    const startR = 65 + Math.random() * 20;
    const windFactor = 1.8 + Math.random() * 1.2; // tighter spirals
    const points: THREE.Vector3[] = [];
    for (let p = 0; p < 30; p++) {
      const t = p / 29;
      const a = startAngle + t * Math.PI * windFactor;
      const r = startR + t * (60 + Math.random() * 80);
      const h = (Math.random() - 0.5) * 12 * (1 - t * 0.7);
      points.push(new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const thickness = 2.5 + Math.random() * 4;
    const tubeGeo = new THREE.TubeGeometry(curve, 40, thickness, 8, false);
    // Color: mix of bright orange, yellow-orange, and hot yellow
    const colorRoll = Math.random();
    const wColor = colorRoll < 0.3 ? 0xffaa22
      : colorRoll < 0.6 ? 0xffcc44
      : colorRoll < 0.85 ? 0xff7711
      : 0xffdd66;
    const tubeMat = new THREE.MeshBasicMaterial({
      color: wColor, transparent: true,
      opacity: 0.2 + Math.random() * 0.2,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const wispMesh = new THREE.Mesh(tubeGeo, tubeMat);
    filamentGroup.add(wispMesh);
    disposables.push(tubeGeo, tubeMat);
  }
  group.add(filamentGroup);

  // ── 7. Inner bright filament ring (white-hot edge around void) ──
  const innerRingGeo = new THREE.TorusGeometry(64, 3.5, 16, 128);
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: 0xffeeaa, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
  innerRing.rotation.x = DISK_TILT;
  group.add(innerRing);
  disposables.push(innerRingGeo, innerRingMat);

  // Thin secondary inner ring
  const innerRing2Geo = new THREE.TorusGeometry(68, 2, 16, 128);
  const innerRing2Mat = new THREE.MeshBasicMaterial({
    color: 0xffcc66, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const innerRing2 = new THREE.Mesh(innerRing2Geo, innerRing2Mat);
  innerRing2.rotation.x = DISK_TILT;
  group.add(innerRing2);
  disposables.push(innerRing2Geo, innerRing2Mat);

  // ── 8. Swirling gas stream particles (spiral inward) ──
  const STREAM_COUNT = 400;
  const streamGeo = new THREE.BufferGeometry();
  const streamPositions = new Float32Array(STREAM_COUNT * 3);
  const streamColors = new Float32Array(STREAM_COUNT * 3);
  const streamAngles = new Float32Array(STREAM_COUNT);
  const streamRadii = new Float32Array(STREAM_COUNT);
  const streamSpeeds = new Float32Array(STREAM_COUNT);
  const streamHeights = new Float32Array(STREAM_COUNT);

  for (let i = 0; i < STREAM_COUNT; i++) {
    streamAngles[i] = Math.random() * Math.PI * 2;
    streamRadii[i] = 60 + Math.random() * 200;
    streamSpeeds[i] = 0.2 + Math.random() * 0.4;
    streamHeights[i] = (Math.random() - 0.5) * 25;
    const t = (streamRadii[i] - 60) / 200;
    streamColors[i * 3] = 1.0;
    streamColors[i * 3 + 1] = 0.5 + (1 - t) * 0.45;
    streamColors[i * 3 + 2] = (1 - t) * 0.3;
  }
  streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPositions, 3));
  streamGeo.setAttribute('color', new THREE.BufferAttribute(streamColors, 3));
  const streamMat = new THREE.PointsMaterial({
    size: 3.5, vertexColors: true, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const streamPoints = new THREE.Points(streamGeo, streamMat);
  streamPoints.rotation.x = DISK_TILT;
  group.add(streamPoints);
  disposables.push(streamGeo, streamMat);

  // ── 9. Radial spark particles (ejected outward from disk) ──
  const SPARK_COUNT = 500;
  const sparkGeo = new THREE.BufferGeometry();
  const sparkPositions = new Float32Array(SPARK_COUNT * 3);
  const sparkColors = new Float32Array(SPARK_COUNT * 3);
  const sparkAngles = new Float32Array(SPARK_COUNT);
  const sparkRadii = new Float32Array(SPARK_COUNT);
  const sparkSpeeds = new Float32Array(SPARK_COUNT); // outward velocity
  const sparkHeights = new Float32Array(SPARK_COUNT);
  const sparkLife = new Float32Array(SPARK_COUNT); // 0-1 lifecycle

  for (let i = 0; i < SPARK_COUNT; i++) {
    sparkAngles[i] = Math.random() * Math.PI * 2;
    sparkRadii[i] = 70 + Math.random() * 60;
    sparkSpeeds[i] = 30 + Math.random() * 120; // fast outward
    sparkHeights[i] = (Math.random() - 0.5) * 40;
    sparkLife[i] = Math.random(); // start at random point in lifecycle
    // Bright orange-yellow-white sparks
    const bright = 0.6 + Math.random() * 0.4;
    sparkColors[i * 3] = 1.0;
    sparkColors[i * 3 + 1] = 0.5 + bright * 0.4;
    sparkColors[i * 3 + 2] = bright * 0.3;
  }
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));
  const sparkMat = new THREE.PointsMaterial({
    size: 2.0, vertexColors: true, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
  sparkPoints.rotation.x = DISK_TILT;
  group.add(sparkPoints);
  disposables.push(sparkGeo, sparkMat);

  // ── 10. Warm point lights ──
  const warmLight = new THREE.PointLight(0xff7700, 3.5, 1000);
  group.add(warmLight);
  const warmLight2 = new THREE.PointLight(0xffaa33, 1.5, 600);
  warmLight2.position.set(40, -20, 30);
  group.add(warmLight2);

  scene.add(group);

  // ── Gravity — pulls ships that fly close ──
  const GRAVITY_STRENGTH = 600;
  const EVENT_HORIZON = 60; // match singularity radius
  const MAX_EFFECT_DIST = 600;
  const _toHole = new THREE.Vector3();

  function applyGravity(entity: Ship3D, dt: number): void {
    if (!entity.alive) return;
    _toHole.subVectors(BLACK_HOLE_POS, entity.position);
    const dist = _toHole.length();
    if (dist < EVENT_HORIZON) {
      entity.applyDamage(9999, performance.now());
      return;
    }
    if (dist < MAX_EFFECT_DIST) {
      const force = GRAVITY_STRENGTH / (dist * dist) * dt;
      _toHole.normalize();
      entity.velocity.addScaledVector(_toHole, force * 60);
    }
  }

  function update(dt: number, now: number, player: Ship3D, enemies: Ship3D[]): void {
    // Advance shader time
    diskUniforms.uTime.value = now;

    // Rotate filament tubes slowly
    filamentGroup.rotation.y += dt * 0.02;

    // Rotate inner rings at different speeds
    innerRing.rotation.z += dt * 0.08;
    innerRing2.rotation.z -= dt * 0.05;

    // Animate stream particles — spiral inward
    const posArr = streamGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < STREAM_COUNT; i++) {
      streamAngles[i] += dt * streamSpeeds[i] * (180 / Math.max(streamRadii[i], 60));
      streamRadii[i] -= dt * 3; // drift inward
      if (streamRadii[i] < 58) {
        streamRadii[i] = 140 + Math.random() * 120;
        streamAngles[i] = Math.random() * Math.PI * 2;
      }
      const a = streamAngles[i];
      const r = streamRadii[i];
      posArr[i * 3] = Math.cos(a) * r;
      posArr[i * 3 + 1] = streamHeights[i] * (r / 200);
      posArr[i * 3 + 2] = Math.sin(a) * r;
    }
    streamGeo.attributes.position.needsUpdate = true;

    // Animate spark particles — radiate outward
    const sparkPosArr = sparkGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < SPARK_COUNT; i++) {
      sparkLife[i] += dt * (0.3 + sparkSpeeds[i] * 0.003);
      if (sparkLife[i] > 1) {
        // Respawn at inner disk edge
        sparkLife[i] = 0;
        sparkAngles[i] = Math.random() * Math.PI * 2;
        sparkRadii[i] = 70 + Math.random() * 40;
        sparkHeights[i] = (Math.random() - 0.5) * 20;
        sparkSpeeds[i] = 30 + Math.random() * 120;
      }
      // Outward radial motion
      const currentR = sparkRadii[i] + sparkLife[i] * sparkSpeeds[i];
      const a = sparkAngles[i] + sparkLife[i] * 0.3; // slight spiral
      sparkPosArr[i * 3] = Math.cos(a) * currentR;
      sparkPosArr[i * 3 + 1] = sparkHeights[i] * (1 - sparkLife[i] * 0.5);
      sparkPosArr[i * 3 + 2] = Math.sin(a) * currentR;
    }
    sparkGeo.attributes.position.needsUpdate = true;

    // Pulsing inner ring
    innerRingMat.opacity = 0.55 + 0.2 * Math.sin(now * 1.8);

    // Flickering warm lights
    warmLight.intensity = 3.0 + 1.0 * Math.sin(now * 0.9);
    warmLight2.intensity = 1.3 + 0.5 * Math.sin(now * 1.4 + 1.0);

    applyGravity(player, dt);
    for (const enemy of enemies) {
      applyGravity(enemy, dt);
    }
  }

  function cleanup(): void {
    scene.remove(group);
    for (const d of disposables) d.dispose();
  }

  return { update, cleanup };
}

// ── Factory — create environment based on level number ──

export function createLevelEnvironment(scene: THREE.Scene, level: number): LevelEnvironment | null {
  switch (level) {
    case 1: return createAsteroidBelt(scene);
    case 2: return createNebulaFog(scene);
    case 3: return createBlackHole(scene);
    default: return null;
  }
}
