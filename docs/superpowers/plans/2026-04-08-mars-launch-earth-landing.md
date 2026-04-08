# Mars Canyon Launch & Earth Spaceport Landing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add fully playable atmospheric flight sequences — canyon launch from Mars and spaceport landing on Earth — that bookend the existing 3-level space combat.

**Architecture:** A shared AtmosphereSystem provides altitude-based physics modifiers (gravity, drag, speed cap) on top of the existing `applyShipPhysics()`. Two new scene modules (MarsLaunch, EarthLanding) generate procedural terrain, manage sequence flow, and drive visual transitions. The SceneManager gains two new states and main.ts wires them into the game flow.

**Tech Stack:** Three.js, TypeScript, Vite, Web Audio API. All terrain is procedural (no external models/textures). Reuses existing noise functions from EnvironmentLoader.ts.

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/systems/AtmosphereSystem.ts` | Altitude-based physics modifiers, sky color interpolation, atmosphere particle config. Shared by both Mars and Earth scenes. |
| `src/terrain/CanyonGeometry.ts` | Procedural Mars canyon walls, floor, arches, mesas. Noise-displaced geometry with vertex colors. |
| `src/terrain/SpaceportGeometry.ts` | Earth landing zone — desert ground, coastline, spaceport structures, guide path rings. |
| `src/scenes/MarsLaunch.ts` | Mars launch sequence — creates canyon terrain, manages the pad-to-orbit flow, drives sky/particle transitions, collision with walls. |
| `src/scenes/EarthLanding.ts` | Earth landing sequence — creates approach, reentry VFX, cloud layer, spaceport terrain, guide path, touchdown detection. |

### Modified Files
| File | Changes |
|------|---------|
| `src/state/SceneManager.ts` | Add `marsLaunch` and `earthLanding` to `SceneState` union type. |
| `src/systems/PhysicsSystem3D.ts` | Add optional `AtmosphereModifiers` parameter to `applyShipPhysics()`. |
| `src/ui/HUD3D.ts` | Add altitude indicator, suppress combat elements during non-combat phases. |
| `src/systems/SoundSystem.ts` | Add wind drone, reentry roar, touchdown, and fanfare synth patches. |
| `src/main.ts` | Wire new scenes into game flow, add scene enter/exit/update handlers. |

---

## Task 1: AtmosphereSystem — Altitude-Based Physics Modifiers

**Files:**
- Create: `src/systems/AtmosphereSystem.ts`

This is the foundation. Both Mars and Earth scenes consume it.

- [ ] **Step 1: Create AtmosphereSystem.ts with types and core function**

```typescript
// src/systems/AtmosphereSystem.ts
// Shared altitude-based atmosphere simulation for Mars launch and Earth landing.
// Provides physics modifiers and visual parameters based on altitude.

import * as THREE from 'three';

export interface AtmosphereModifiers {
  gravity: number;       // downward force (0 = space, ~3.7 = Mars, ~9.8 = Earth)
  drag: number;          // atmospheric drag multiplier (0 = vacuum, 1 = thick atmo)
  speedCap: number;      // max velocity at this altitude
}

export interface AtmosphereVisuals {
  skyColor: THREE.Color;       // current sky gradient color
  fogDensity: number;          // 0 = clear, 1 = dense haze
  fogColor: THREE.Color;
  particleDensity: number;     // 0-1, controls dust/ice crystal spawn rate
  particleType: 'dust' | 'ice' | 'none';
}

export interface AtmosphereConfig {
  maxAltitude: number;         // altitude where atmosphere ends (full space)
  surfaceGravity: number;      // gravity at altitude 0
  surfaceDrag: number;         // drag at altitude 0
  surfaceSpeedCap: number;     // speed cap at altitude 0
  spaceSpeedCap: number;       // speed cap in full vacuum
  skyColors: Array<{ altitude: number; color: THREE.Color }>;  // gradient stops
  fogColorSurface: THREE.Color;
  fogColorHigh: THREE.Color;
  dustCeiling: number;         // altitude above which dust stops
  iceBand: [number, number];   // altitude range for ice crystals
}

/** Mars atmosphere config. */
export const MARS_ATMOSPHERE: AtmosphereConfig = {
  maxAltitude: 2000,
  surfaceGravity: 3.7,
  surfaceDrag: 0.4,
  surfaceSpeedCap: 60,
  spaceSpeedCap: 100,
  skyColors: [
    { altitude: 0, color: new THREE.Color(0xc2886a) },     // dusty salmon
    { altitude: 400, color: new THREE.Color(0x8b5a3a) },   // deep red-brown
    { altitude: 1000, color: new THREE.Color(0x2a1a30) },  // dark purple
    { altitude: 1600, color: new THREE.Color(0x0a0612) },  // near black
    { altitude: 2000, color: new THREE.Color(0x010208) },  // space black
  ],
  fogColorSurface: new THREE.Color(0xc2886a),
  fogColorHigh: new THREE.Color(0x1a0a14),
  dustCeiling: 600,
  iceBand: [800, 1400],
};

/** Earth atmosphere config. */
export const EARTH_ATMOSPHERE: AtmosphereConfig = {
  maxAltitude: 3000,
  surfaceGravity: 9.8,
  surfaceDrag: 0.7,
  surfaceSpeedCap: 40,
  spaceSpeedCap: 100,
  skyColors: [
    { altitude: 0, color: new THREE.Color(0x5588cc) },     // blue sky
    { altitude: 500, color: new THREE.Color(0x4477bb) },   // deeper blue
    { altitude: 1200, color: new THREE.Color(0x1a3355) },  // dark blue
    { altitude: 2000, color: new THREE.Color(0x0a1225) },  // near black
    { altitude: 3000, color: new THREE.Color(0x010208) },  // space black
  ],
  fogColorSurface: new THREE.Color(0xaabbcc),
  fogColorHigh: new THREE.Color(0x1a2a40),
  dustCeiling: 100,
  iceBand: [1500, 2500],
};

/** Compute atmosphere modifiers for a given altitude. */
export function getAtmosphereModifiers(config: AtmosphereConfig, altitude: number): AtmosphereModifiers {
  const t = Math.max(0, Math.min(1, altitude / config.maxAltitude));
  const easeOut = 1 - (1 - t) * (1 - t); // quadratic ease — atmosphere thins faster near top

  return {
    gravity: config.surfaceGravity * (1 - easeOut),
    drag: config.surfaceDrag * (1 - easeOut),
    speedCap: config.surfaceSpeedCap + (config.spaceSpeedCap - config.surfaceSpeedCap) * easeOut,
  };
}

/** Compute visual parameters for a given altitude. */
export function getAtmosphereVisuals(config: AtmosphereConfig, altitude: number): AtmosphereVisuals {
  const t = Math.max(0, Math.min(1, altitude / config.maxAltitude));

  // Sky color — interpolate between gradient stops
  const skyColor = new THREE.Color();
  const stops = config.skyColors;
  for (let i = 0; i < stops.length - 1; i++) {
    if (altitude >= stops[i].altitude && altitude <= stops[i + 1].altitude) {
      const localT = (altitude - stops[i].altitude) / (stops[i + 1].altitude - stops[i].altitude);
      skyColor.copy(stops[i].color).lerp(stops[i + 1].color, localT);
      break;
    }
  }
  if (altitude >= stops[stops.length - 1].altitude) {
    skyColor.copy(stops[stops.length - 1].color);
  }

  // Fog
  const fogDensity = Math.max(0, 1 - t * 2); // fades out by 50% altitude
  const fogColor = new THREE.Color().copy(config.fogColorSurface).lerp(config.fogColorHigh, t);

  // Particles
  let particleDensity = 0;
  let particleType: 'dust' | 'ice' | 'none' = 'none';
  if (altitude < config.dustCeiling) {
    particleDensity = 1 - altitude / config.dustCeiling;
    particleType = 'dust';
  } else if (altitude >= config.iceBand[0] && altitude <= config.iceBand[1]) {
    const mid = (config.iceBand[0] + config.iceBand[1]) / 2;
    particleDensity = 1 - Math.abs(altitude - mid) / ((config.iceBand[1] - config.iceBand[0]) / 2);
    particleType = 'ice';
  }

  return { skyColor, fogDensity, fogColor, particleDensity, particleType };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/systems/AtmosphereSystem.ts
git commit -m "feat: add AtmosphereSystem with altitude-based physics and visuals"
```

---

## Task 2: Integrate AtmosphereModifiers into PhysicsSystem3D

**Files:**
- Modify: `src/systems/PhysicsSystem3D.ts`

- [ ] **Step 1: Add optional atmosphere parameter to applyShipPhysics**

In `src/systems/PhysicsSystem3D.ts`, add the import and modify the function signature. The entire modified file:

```typescript
// At the top, add import:
import type { AtmosphereModifiers } from './AtmosphereSystem';

// Change function signature (line 21):
export function applyShipPhysics(
  ship: Ship3D,
  input: ShipInput,
  dt: number,
  now: number,
  atmosphere?: AtmosphereModifiers,
): void {
```

After the existing `ship.group.quaternion.normalize();` block (after rotation), add atmosphere gravity and drag before the existing thrust section:

```typescript
  // ── Atmosphere effects ──
  if (atmosphere) {
    // Gravity — pull downward
    if (atmosphere.gravity > 0) {
      ship.velocity.y -= atmosphere.gravity * dt;
    }
    // Atmospheric drag — additional resistance on top of space drag
    if (atmosphere.drag > 0) {
      const atmoDrag = Math.exp(-atmosphere.drag * dt);
      ship.velocity.multiplyScalar(atmoDrag);
    }
  }
```

After the existing velocity cap section, add atmosphere speed cap override:

```typescript
  // ── Atmosphere speed cap override ──
  if (atmosphere && atmosphere.speedCap < PHYSICS.MAX_VELOCITY * ship.speedMult) {
    const maxSpeed = atmosphere.speedCap * ship.speedMult;
    if (speed > maxSpeed) {
      ship.velocity.setLength(maxSpeed);
    }
  }
```

- [ ] **Step 2: Verify existing arena still works**

Run `npm run dev` and play through Level 1. The arena calls `applyShipPhysics(player, input, effectiveDt, now)` without the atmosphere parameter, so behavior should be identical.

- [ ] **Step 3: Commit**

```bash
git add src/systems/PhysicsSystem3D.ts
git commit -m "feat: add optional atmosphere modifiers to ship physics"
```

---

## Task 3: Mars Canyon Terrain Generation

**Files:**
- Create: `src/terrain/CanyonGeometry.ts`

This is the biggest visual task. Procedural canyon walls, floor, arches, and mesas using the existing noise stack.

- [ ] **Step 1: Create CanyonGeometry.ts**

```typescript
// src/terrain/CanyonGeometry.ts
// Procedural Mars canyon terrain — walls, floor, arches, mesas.
// Uses the noise stack from EnvironmentLoader for organic rock surfaces.

import * as THREE from 'three';
import { fbm3D, ridgedNoise3D, valueNoise3D } from '../systems/EnvironmentLoader';

/** Canyon configuration */
export interface CanyonConfig {
  length: number;        // total canyon length (Z axis)
  baseWidth: number;     // width at floor level
  topWidth: number;      // width at top (wider = flared)
  wallHeight: number;    // canyon wall height
  segmentsZ: number;     // longitudinal resolution
  segmentsY: number;     // vertical resolution per wall
}

const DEFAULT_CONFIG: CanyonConfig = {
  length: 2000,
  baseWidth: 80,
  topWidth: 200,
  wallHeight: 500,
  segmentsZ: 60,
  segmentsY: 30,
};

/** Create a single canyon wall (left or right). */
function createWall(
  side: -1 | 1,
  config: CanyonConfig,
  seed: number,
): THREE.Mesh {
  const { length, baseWidth, topWidth, wallHeight, segmentsZ, segmentsY } = config;

  const geo = new THREE.PlaneGeometry(length, wallHeight, segmentsZ, segmentsY);
  const posAttr = geo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i); // along canyon length
    const y = posAttr.getY(i); // vertical
    const z = posAttr.getZ(i); // will become the wall depth/offset

    // Normalized coordinates
    const nz = (x + length / 2) / length;   // 0-1 along canyon
    const ny = (y + wallHeight / 2) / wallHeight; // 0=bottom, 1=top

    // Wall distance from center — wider at top
    const widthAtHeight = baseWidth + (topWidth - baseWidth) * ny;
    const baseOffset = side * widthAtHeight / 2;

    // Noise displacement — pushes wall in/out for craggy surface
    const sx = nz * 6 + seed, sy = ny * 4 + seed * 0.3;
    const bigDisp = fbm3D(sx, sy, seed * 0.1, 4) * 30;
    const midDisp = ridgedNoise3D(sx * 3, sy * 3, seed * 0.5, 3) * 12;
    const fineDisp = valueNoise3D(sx * 8, sy * 8, seed * 0.7) * 4;

    // Overhang potential — some areas push outward more at top
    const overhang = ridgedNoise3D(sx * 1.5, sy * 0.5, seed + 50, 2);
    const overhangOffset = ny > 0.6 ? overhang * 15 * (ny - 0.6) / 0.4 : 0;

    const totalOffset = baseOffset + (bigDisp + midDisp + fineDisp + overhangOffset) * side * -1;

    // Remap: X = along canyon (Z in world), Y = vertical (Y in world), Z = wall offset (X in world)
    posAttr.setXYZ(i, x, y, totalOffset);

    // Vertex colors — sediment striping + iron oxide variation
    const stripeNoise = Math.sin(ny * 20 + fbm3D(sx * 2, ny * 8, seed, 2) * 3) * 0.5 + 0.5;
    const ironNoise = valueNoise3D(sx * 4, sy * 4, seed + 10);

    // Base: Mars red-orange
    let r = 0.55 + stripeNoise * 0.15;
    let g = 0.28 + stripeNoise * 0.08;
    let b = 0.15 + stripeNoise * 0.05;

    // Dark iron bands
    if (ironNoise > 0.6) {
      const dark = (ironNoise - 0.6) * 2;
      r -= dark * 0.2;
      g -= dark * 0.15;
      b -= dark * 0.08;
    }

    // Lighter dust at top
    if (ny > 0.8) {
      const dustT = (ny - 0.8) / 0.2;
      r += dustT * 0.1;
      g += dustT * 0.06;
      b += dustT * 0.03;
    }

    colors[i * 3] = Math.max(0, Math.min(1, r));
    colors[i * 3 + 1] = Math.max(0, Math.min(1, g));
    colors[i * 3 + 2] = Math.max(0, Math.min(1, b));
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  // Rotate so the plane faces inward and Z runs along the canyon
  mesh.rotation.y = side * Math.PI / 2;
  return mesh;
}

/** Create the canyon floor — uneven rocky ground with a landing pad area. */
function createFloor(config: CanyonConfig, seed: number): THREE.Group {
  const group = new THREE.Group();

  const geo = new THREE.PlaneGeometry(config.baseWidth * 2, config.length, 40, 60);
  geo.rotateX(-Math.PI / 2);
  const posAttr = geo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);

    // Noise displacement for uneven rocky ground
    const sx = x * 0.02 + seed, sz = z * 0.01 + seed * 0.5;
    const heightDisp = fbm3D(sx, 0, sz, 4) * 8 + ridgedNoise3D(sx * 3, 0, sz * 3, 2) * 3;

    // Flatten near the landing pad (z near 0, x near 0)
    const distFromPad = Math.sqrt(x * x + z * z);
    const padSmooth = Math.min(1, distFromPad / 40);
    posAttr.setY(i, heightDisp * padSmooth);

    // Vertex colors — dusty Mars floor
    const dustNoise = valueNoise3D(sx * 2, 0, sz * 2);
    colors[i * 3] = 0.45 + dustNoise * 0.1;
    colors[i * 3 + 1] = 0.22 + dustNoise * 0.05;
    colors[i * 3 + 2] = 0.12 + dustNoise * 0.03;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const floorMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.03,
  });
  group.add(new THREE.Mesh(geo, floorMat));

  // Landing pad — flat circle with markings
  const padGeo = new THREE.CircleGeometry(15, 32);
  padGeo.rotateX(-Math.PI / 2);
  const padMat = new THREE.MeshStandardMaterial({
    color: 0x555555,
    roughness: 0.7,
    metalness: 0.2,
    emissive: 0x111111,
    emissiveIntensity: 0.3,
  });
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.y = 0.1; // slightly above floor
  group.add(pad);

  // Pad edge ring — glowing cyan
  const ringGeo = new THREE.TorusGeometry(15, 0.3, 8, 32);
  ringGeo.rotateX(Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00ccff,
    transparent: true,
    opacity: 0.6,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.2;
  group.add(ring);

  return group;
}

/** Create a natural rock arch spanning the canyon. */
function createArch(z: number, config: CanyonConfig, seed: number): THREE.Mesh {
  // Deformed torus that spans the canyon width
  const span = config.baseWidth * 0.8;
  const thickness = 6 + valueNoise3D(seed, seed * 0.3, 0) * 4;
  const geo = new THREE.TorusGeometry(span / 2, thickness, 12, 24, Math.PI);
  const posAttr = geo.attributes.position;

  // Rock noise displacement
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i), y = posAttr.getY(i), zz = posAttr.getZ(i);
    const len = Math.sqrt(x * x + y * y + zz * zz);
    if (len < 0.01) continue;
    const nx = x / len, ny = y / len, nz = zz / len;
    const disp = 1 + fbm3D(nx * 3 + seed, ny * 3, nz * 3, 3) * 0.2;
    posAttr.setXYZ(i, x * disp, y * disp, zz * disp);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x8b5a3a,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, config.wallHeight * 0.35, z);
  mesh.rotation.z = Math.PI / 2; // arch spans left-right
  return mesh;
}

/** Create distant mesa silhouettes along the horizon. */
function createMesas(config: CanyonConfig, seed: number): THREE.Group {
  const group = new THREE.Group();
  const count = 8 + Math.floor(valueNoise3D(seed, 0, 0) * 5);

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const dist = 800 + valueNoise3D(seed + i, 0, 0) * 400;
    const height = 100 + valueNoise3D(seed, i * 10, 0) * 200;
    const width = 80 + valueNoise3D(seed + i, i, 0) * 120;

    const geo = new THREE.BoxGeometry(width, height, width * 0.6, 4, 4, 4);
    const posAttr = geo.attributes.position;

    // Noise the cliff faces, keep top flat
    for (let v = 0; v < posAttr.count; v++) {
      const x = posAttr.getX(v), y = posAttr.getY(v), z = posAttr.getZ(v);
      if (y < height / 2 - 5) { // don't displace flat top
        const disp = fbm3D(x * 0.03 + seed + i, y * 0.02, z * 0.03, 3) * 10;
        posAttr.setX(v, x + disp);
        posAttr.setZ(v, z + disp * 0.5);
      }
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x6b3a2a,
      roughness: 0.95,
      metalness: 0.03,
      flatShading: true,
    });

    const mesa = new THREE.Mesh(geo, mat);
    mesa.position.set(
      Math.cos(angle) * dist,
      height / 2,
      Math.sin(angle) * dist,
    );
    group.add(mesa);
  }

  return group;
}

/** Small equipment structures near the landing pad. */
function createBaseEquipment(): THREE.Group {
  const group = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x888888, metalness: 0.7, roughness: 0.4,
  });

  // Antenna dish
  const dishGeo = new THREE.SphereGeometry(3, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.4);
  const dish = new THREE.Mesh(dishGeo, metalMat);
  dish.position.set(20, 8, -10);
  dish.rotation.x = -0.3;
  group.add(dish);

  // Antenna pole
  const poleGeo = new THREE.CylinderGeometry(0.3, 0.3, 8, 6);
  const pole = new THREE.Mesh(poleGeo, metalMat);
  pole.position.set(20, 4, -10);
  group.add(pole);

  // Fuel tanks
  for (let i = 0; i < 3; i++) {
    const tankGeo = new THREE.CylinderGeometry(2, 2, 6, 12);
    const tank = new THREE.Mesh(tankGeo, metalMat);
    tank.position.set(-18 + i * 5, 3, 15);
    group.add(tank);
  }

  // Cargo containers
  const containerMat = new THREE.MeshStandardMaterial({
    color: 0x885533, roughness: 0.8, metalness: 0.2,
  });
  for (let i = 0; i < 2; i++) {
    const boxGeo = new THREE.BoxGeometry(4, 3, 6);
    const box = new THREE.Mesh(boxGeo, containerMat);
    box.position.set(25, 1.5, 8 + i * 8);
    group.add(box);
  }

  return group;
}

export interface CanyonTerrain {
  group: THREE.Group;
  /** Invisible wall collision planes (left and right). Used for simple distance checks. */
  wallCenterX: { left: number; right: number };
  canyonLength: number;
  cleanup(): void;
}

/** Generate the complete Mars canyon terrain. */
export function createCanyonTerrain(scene: THREE.Scene, seed = 42): CanyonTerrain {
  const config = DEFAULT_CONFIG;
  const group = new THREE.Group();

  // Walls
  const leftWall = createWall(-1, config, seed);
  const rightWall = createWall(1, config, seed + 100);
  group.add(leftWall);
  group.add(rightWall);

  // Floor
  const floor = createFloor(config, seed + 200);
  group.add(floor);

  // Arches — 2-3 natural rock arches at varying Z positions
  const archCount = 2 + Math.floor(valueNoise3D(seed, 0, 0) * 2);
  for (let i = 0; i < archCount; i++) {
    const z = config.length * 0.2 + (i / archCount) * config.length * 0.5;
    group.add(createArch(z, config, seed + 300 + i * 50));
  }

  // Mesas on the horizon
  const mesas = createMesas(config, seed + 400);
  group.add(mesas);

  // Base equipment near pad
  const equipment = createBaseEquipment();
  group.add(equipment);

  // Warm directional light — low angle Mars sun
  const sunLight = new THREE.DirectionalLight(0xffaa66, 1.5);
  sunLight.position.set(200, 100, -500);
  group.add(sunLight);

  // Ambient fill — scattered Martian light
  const ambientLight = new THREE.AmbientLight(0x553322, 0.4);
  group.add(ambientLight);

  scene.add(group);

  return {
    group,
    wallCenterX: { left: -config.baseWidth / 2, right: config.baseWidth / 2 },
    canyonLength: config.length,
    cleanup() {
      scene.remove(group);
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    },
  };
}
```

Note: This requires exporting the noise functions from EnvironmentLoader. We'll do that in the next step.

- [ ] **Step 2: Export noise functions from EnvironmentLoader.ts**

In `src/systems/EnvironmentLoader.ts`, change these functions from module-private to exported:

```typescript
// Change these 5 function declarations from plain to exported:
export function valueNoise3D(...)
export function fbm3D(...)
export function ridgedNoise3D(...)
export function warpedFbm3D(...)
export function doubleWarpedFbm3D(...)
```

The helper functions `_hash3`, `_lerp`, `_fade` remain unexported (they're implementation details).

- [ ] **Step 3: Commit**

```bash
git add src/terrain/CanyonGeometry.ts src/systems/EnvironmentLoader.ts
git commit -m "feat: add procedural Mars canyon terrain with walls, floor, arches, mesas"
```

---

## Task 4: Earth Spaceport Terrain Generation

**Files:**
- Create: `src/terrain/SpaceportGeometry.ts`

- [ ] **Step 1: Create SpaceportGeometry.ts**

```typescript
// src/terrain/SpaceportGeometry.ts
// Procedural Earth spaceport terrain — desert ground, coastline,
// water, structures, and landing guide path.

import * as THREE from 'three';
import { fbm3D, valueNoise3D } from '../systems/EnvironmentLoader';

/** Create the desert ground plane with dune noise and vertex colors. */
function createDesertGround(seed: number): THREE.Mesh {
  const size = 4000;
  const geo = new THREE.PlaneGeometry(size, size, 80, 80);
  geo.rotateX(-Math.PI / 2);
  const posAttr = geo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i), z = posAttr.getZ(i);
    const sx = x * 0.003 + seed, sz = z * 0.003 + seed * 0.5;

    // Rolling dunes
    const height = fbm3D(sx, 0, sz, 4) * 15 + Math.sin(x * 0.005 + z * 0.003) * 5;

    // Flatten near spaceport (center)
    const distFromCenter = Math.sqrt(x * x + z * z);
    const flattenT = Math.min(1, distFromCenter / 300);
    posAttr.setY(i, height * flattenT);

    // Ocean beyond +X edge
    if (x > 1500) {
      posAttr.setY(i, -2); // below water line
    }

    // Vertex colors — sandy tan
    const dustNoise = valueNoise3D(sx * 3, 0, sz * 3);
    let r = 0.7 + dustNoise * 0.08;
    let g = 0.6 + dustNoise * 0.06;
    let b = 0.42 + dustNoise * 0.04;

    // Darker dry earth patches
    if (dustNoise > 0.3) {
      const dark = (dustNoise - 0.3) * 0.3;
      r -= dark; g -= dark * 0.8; b -= dark * 0.6;
    }

    // Salt flat regions (pale)
    const saltNoise = valueNoise3D(sx * 1.5, 0, sz * 1.5 + 50);
    if (saltNoise > 0.6) {
      const pale = (saltNoise - 0.6) * 0.5;
      r += pale; g += pale; b += pale * 0.8;
    }

    colors[i * 3] = Math.max(0, Math.min(1, r));
    colors[i * 3 + 1] = Math.max(0, Math.min(1, g));
    colors[i * 3 + 2] = Math.max(0, Math.min(1, b));
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.9, metalness: 0.03,
  }));
}

/** Ocean water plane with blue-green material. */
function createOcean(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(4000, 4000);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a5577,
    metalness: 0.15,
    roughness: 0.3,
    transparent: true,
    opacity: 0.85,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(3000, -1, 0); // offset to eastern edge
  return mesh;
}

/** Spaceport structures — pad, tower, hangars, fuel tanks. */
function createSpaceportStructures(): THREE.Group {
  const group = new THREE.Group();

  // Landing pad — large circle
  const padGeo = new THREE.CircleGeometry(30, 48);
  padGeo.rotateX(-Math.PI / 2);
  const padMat = new THREE.MeshStandardMaterial({
    color: 0x666666, roughness: 0.6, metalness: 0.3,
  });
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.y = 0.2;
  group.add(pad);

  // Pad edge lights — pulsing cyan ring
  const padRing = new THREE.Mesh(
    new THREE.TorusGeometry(30, 0.5, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.7 }),
  );
  padRing.rotation.x = Math.PI / 2;
  padRing.position.y = 0.3;
  padRing.name = 'pad-ring'; // for pulsing animation
  group.add(padRing);

  // Control tower
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0x888888, metalness: 0.6, roughness: 0.4,
  });
  const towerBase = new THREE.Mesh(new THREE.BoxGeometry(8, 40, 8), towerMat);
  towerBase.position.set(-60, 20, 30);
  group.add(towerBase);

  // Tower top (glass cabin)
  const cabinMat = new THREE.MeshPhysicalMaterial({
    color: 0x112244, transmission: 0.5, thickness: 0.3, roughness: 0.1,
  });
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 12), cabinMat);
  cabin.position.set(-60, 43, 30);
  group.add(cabin);

  // Tower antenna
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 10, 6),
    towerMat,
  );
  antenna.position.set(-60, 51, 30);
  group.add(antenna);

  // Hangars
  for (let i = 0; i < 3; i++) {
    const hangarGeo = new THREE.BoxGeometry(25, 10, 40);
    const hangar = new THREE.Mesh(hangarGeo, new THREE.MeshStandardMaterial({
      color: 0x777777, roughness: 0.7, metalness: 0.3,
    }));
    hangar.position.set(-80, 5, -60 + i * 50);
    group.add(hangar);
  }

  // Fuel tanks
  const tankMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc, metalness: 0.7, roughness: 0.3,
  });
  for (let i = 0; i < 4; i++) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 12, 16), tankMat);
    tank.position.set(50, 6, -30 + i * 20);
    group.add(tank);
  }

  // Roads — dark strips
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x333333, roughness: 0.8, metalness: 0.1,
  });
  const road1 = new THREE.Mesh(new THREE.PlaneGeometry(200, 6), roadMat);
  road1.rotation.x = -Math.PI / 2;
  road1.position.set(-40, 0.15, 0);
  group.add(road1);

  const road2 = new THREE.Mesh(new THREE.PlaneGeometry(6, 150), roadMat);
  road2.rotation.x = -Math.PI / 2;
  road2.position.set(-60, 0.15, 0);
  group.add(road2);

  return group;
}

/** Holographic guide path — a corridor of cyan rings leading to the pad. */
export function createGuidePath(startY: number, count = 20): THREE.Group {
  const group = new THREE.Group();
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00ccff,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < count; i++) {
    const t = i / count;
    const y = startY * (1 - t);          // descend from startY to 0
    const z = -200 + t * 200;            // approach from behind
    const ringSize = 20 + (1 - t) * 30;  // bigger further away, tighter near pad

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(ringSize, 0.4, 8, 32),
      ringMat.clone(),
    );
    ring.position.set(0, y, z);
    ring.rotation.x = Math.PI / 2; // face the approaching ship
    ring.name = `guide-ring-${i}`;
    group.add(ring);
  }

  return group;
}

/** Desert scrub vegetation — billboard quads. */
function createVegetation(seed: number): THREE.Group {
  const group = new THREE.Group();
  const scrubMat = new THREE.MeshBasicMaterial({
    color: 0x556633,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < 30; i++) {
    const x = (valueNoise3D(seed + i, 0, 0) - 0.5) * 600;
    const z = (valueNoise3D(0, seed + i, 0) - 0.5) * 600;
    const distFromCenter = Math.sqrt(x * x + z * z);
    if (distFromCenter < 50) continue; // no scrub on the pad

    const size = 2 + valueNoise3D(seed + i, i, 0) * 3;
    const quad = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      scrubMat,
    );
    quad.position.set(x, size / 2, z);
    // Face the camera (billboard) — we'll rotate in the update loop
    quad.rotation.y = valueNoise3D(i, seed, 0) * Math.PI;
    group.add(quad);
  }

  return group;
}

export interface SpaceportTerrain {
  group: THREE.Group;
  guidePathGroup: THREE.Group;
  padRing: THREE.Mesh;
  cleanup(): void;
}

/** Generate the complete Earth spaceport terrain. */
export function createSpaceportTerrain(scene: THREE.Scene, seed = 99): SpaceportTerrain {
  const group = new THREE.Group();

  group.add(createDesertGround(seed));
  group.add(createOcean());

  const structures = createSpaceportStructures();
  group.add(structures);

  const guidePathGroup = createGuidePath(500, 20);
  guidePathGroup.visible = false; // shown during approach
  group.add(guidePathGroup);

  group.add(createVegetation(seed + 50));

  // Earth atmosphere fog
  const fog = new THREE.FogExp2(0xaabbcc, 0.0003);

  // Sun — higher and whiter than Mars
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
  sunLight.position.set(500, 300, 400);
  group.add(sunLight);

  const ambientLight = new THREE.AmbientLight(0x445566, 0.5);
  group.add(ambientLight);

  scene.add(group);

  // Find the pad ring for animation
  let padRing: THREE.Mesh = null!;
  structures.traverse((child) => {
    if (child.name === 'pad-ring' && child instanceof THREE.Mesh) padRing = child;
  });

  return {
    group,
    guidePathGroup,
    padRing,
    cleanup() {
      scene.remove(group);
      scene.fog = null;
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/terrain/SpaceportGeometry.ts
git commit -m "feat: add procedural Earth spaceport terrain with desert, ocean, structures"
```

---

## Task 5: Atmosphere Sound Effects

**Files:**
- Modify: `src/systems/SoundSystem.ts`

- [ ] **Step 1: Add new synth patches to SoundSystem**

Add these methods to the `SoundSystem` class in `src/systems/SoundSystem.ts`:

```typescript
  // ── Atmospheric wind drone (Mars canyon) ──
  private windOsc: OscillatorNode | null = null;
  private windGain: GainNode | null = null;

  startWindDrone(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterGain || this.windOsc) return;

    this.windOsc = ctx.createOscillator();
    this.windGain = ctx.createGain();
    const filter = this.lpf(ctx, 200);

    this.windOsc.type = 'sawtooth';
    this.windOsc.frequency.value = 55;
    this.windGain.gain.value = 0.08;

    this.windOsc.connect(filter);
    filter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    this.windOsc.start();
  }

  /** Fade wind volume based on altitude (0 = full, 1 = silent). */
  setWindIntensity(t: number): void {
    if (this.windGain) {
      this.windGain.gain.value = Math.max(0, 0.08 * (1 - t));
    }
  }

  stopWindDrone(): void {
    if (this.windOsc) {
      this.windOsc.stop();
      this.windOsc = null;
      this.windGain = null;
    }
  }

  // ── Reentry roar (Earth landing) ──
  reentryRoar(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    // White noise through low-pass = atmospheric roar
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = ctx.createGain();
    const filter = this.lpf(ctx, 300);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 1);
    gain.gain.linearRampToValueAtTime(0.2, now + 2);
    gain.gain.linearRampToValueAtTime(0, now + 3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 3);
  }

  // ── Touchdown sequence ──
  touchdown(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    // Mechanical thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  // ── Landing fanfare — triumphant synth chord ──
  landingFanfare(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    // Major chord: C4 E4 G4 C5
    const freqs = [261.6, 329.6, 392.0, 523.3];
    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
      gain.gain.setValueAtTime(0.08, now + 1.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 3);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 3);
    }
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/systems/SoundSystem.ts
git commit -m "feat: add wind drone, reentry roar, touchdown, and fanfare sound effects"
```

---

## Task 6: HUD Altitude Indicator

**Files:**
- Modify: `src/ui/HUD3D.ts`

- [ ] **Step 1: Add altitude display and phase-aware visibility**

Add a new property and element to the `HUD3D` class:

```typescript
  private altitudeEl: HTMLDivElement;
  private missionPhase: 'launch' | 'combat' | 'landing' | null = null;
```

In the constructor, after the existing HUD elements, add:

```typescript
    // Altitude indicator — shown during launch/landing only
    this.altitudeEl = document.createElement('div');
    this.altitudeEl.style.cssText = `
      position:absolute;top:50%;right:20px;transform:translateY(-50%);
      font-family:var(--font-display);font-size:14px;color:var(--cyan);
      letter-spacing:2px;text-align:right;display:none;
    `;
    this.container.appendChild(this.altitudeEl);
```

Add a method to set mission phase:

```typescript
  /** Set mission phase to control which HUD elements are visible. */
  setMissionPhase(phase: 'launch' | 'combat' | 'landing' | null): void {
    this.missionPhase = phase;
    const isAtmo = phase === 'launch' || phase === 'landing';
    this.altitudeEl.style.display = isAtmo ? 'block' : 'none';
    // Hide combat-specific elements during atmospheric flight
    // (targetsEl, scoreEl handled by existing update logic — enemies array will be empty)
  }

  /** Update altitude display. */
  updateAltitude(altitude: number): void {
    if (this.missionPhase === 'launch' || this.missionPhase === 'landing') {
      const alt = Math.max(0, Math.round(altitude));
      this.altitudeEl.textContent = `ALT ${alt.toLocaleString()}m`;
    }
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/HUD3D.ts
git commit -m "feat: add altitude indicator to HUD for atmospheric flight phases"
```

---

## Task 7: SceneManager — Add New Scene States

**Files:**
- Modify: `src/state/SceneManager.ts`
- Modify: `src/state/LevelState.ts`

- [ ] **Step 1: Update SceneState type**

In `src/state/SceneManager.ts`, add the new states:

```typescript
export type SceneState = 'title' | 'charSelect' | 'levelIntro' | 'cinematic' | 'marsLaunch' | 'arena' | 'earthLanding' | 'highScore' | 'gameOver';
```

- [ ] **Step 2: Add mission phase tracking to LevelState**

In `src/state/LevelState.ts`, add:

```typescript
export type MissionPhase = 'launch' | 'combat' | 'landing';
export let currentMissionPhase: MissionPhase = 'launch';

export function setMissionPhase(phase: MissionPhase): void {
  currentMissionPhase = phase;
}
```

And update `resetLevelState()` to include:

```typescript
export function resetLevelState(): void {
  currentLevelIndex = 0;
  carryOverHull = null;
  carryOverShield = null;
  totalScore = 0;
  currentMissionPhase = 'launch';
}
```

- [ ] **Step 3: Commit**

```bash
git add src/state/SceneManager.ts src/state/LevelState.ts
git commit -m "feat: add marsLaunch and earthLanding scene states, mission phase tracking"
```

---

## Task 8: Mars Launch Scene

**Files:**
- Create: `src/scenes/MarsLaunch.ts`

This is the core launch gameplay scene — ties together canyon terrain, atmosphere system, physics, particles, and HUD.

- [ ] **Step 1: Create MarsLaunch.ts**

```typescript
// src/scenes/MarsLaunch.ts
// Playable Mars canyon launch — player ascends from canyon floor
// through thinning atmosphere into orbit. Uses AtmosphereSystem
// for physics and visual transitions.

import * as THREE from 'three';
import { Ship3D } from '../entities/Ship3D';
import { createPlayerShipGeometry } from '../ships/ShipGeometry';
import { createPlayerMaterials, applyMaterials } from '../ships/ShipMaterials';
import { applyShipPhysics, type ShipInput } from '../systems/PhysicsSystem3D';
import { CockpitCamera } from '../camera/CockpitCamera';
import { TouchControls3D } from '../ui/TouchControls3D';
import { MouseControls } from '../ui/MouseControls';
import { SoundSystem } from '../systems/SoundSystem';
import { HUD3D } from '../ui/HUD3D';
import { createCanyonTerrain, type CanyonTerrain } from '../terrain/CanyonGeometry';
import {
  MARS_ATMOSPHERE,
  getAtmosphereModifiers,
  getAtmosphereVisuals,
} from '../systems/AtmosphereSystem';
import { currentCharacter, CHARACTERS } from '../state/Character';
import { COLORS, SHIP } from '../config';
import { DIFFICULTY, currentDifficulty } from '../state/Difficulty';

export interface MarsLaunchState {
  player: Ship3D;
  cockpitCam: CockpitCamera;
  touchControls: TouchControls3D;
  mouseControls: MouseControls;
  sound: SoundSystem;
  hud: HUD3D;
  canyon: CanyonTerrain;
  camera: THREE.PerspectiveCamera;
  dustParticles: THREE.Points;
  altitude: number;
  phase: 'grounded' | 'climbing' | 'orbit';
  orbitReached: boolean;
  orbitTimer: number;
  promptEl: HTMLDivElement | null;
}

export function createMarsLaunch(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): MarsLaunchState {
  // Player ship
  const charConfig = CHARACTERS[currentCharacter];
  const playerColor = charConfig?.color ?? COLORS.player;
  const playerGeo = createPlayerShipGeometry();
  applyMaterials(playerGeo, createPlayerMaterials(playerColor));
  playerGeo.position.set(0, 2, 0); // slightly above pad
  playerGeo.visible = false; // cockpit view — ship hidden
  scene.add(playerGeo);

  const diff = DIFFICULTY[currentDifficulty];
  const player = new Ship3D({
    group: playerGeo,
    maxHull: diff.playerHull,
    maxShield: diff.playerShield,
    speedMult: 1.0,
    rotationMult: 1.0,
    isPlayer: true,
  });

  // Canyon terrain
  const canyon = createCanyonTerrain(scene);

  // Sky — start with Mars surface color
  scene.background = new THREE.Color(0xc2886a);

  // Dust particles near ground
  const dustCount = 500;
  const dustGeo = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 200;
    dustPositions[i * 3 + 1] = Math.random() * 100;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 200;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xccaa88, size: 0.8, transparent: true, opacity: 0.4,
    sizeAttenuation: true, depthWrite: false,
  });
  const dustParticles = new THREE.Points(dustGeo, dustMat);
  scene.add(dustParticles);

  // Systems
  const cockpitCam = new CockpitCamera(camera);
  const touchControls = new TouchControls3D();
  const mouseControls = new MouseControls();
  const sound = new SoundSystem();
  sound.init();
  sound.startWindDrone();

  const hud = new HUD3D();
  hud.setMissionPhase('launch');

  // "HOLD THRUST TO LAUNCH" prompt
  const promptEl = document.createElement('div');
  promptEl.textContent = 'HOLD THRUST TO LAUNCH';
  promptEl.style.cssText = `
    position:fixed;bottom:30%;left:50%;transform:translateX(-50%);
    font-family:var(--font-display);font-size:clamp(14px,3vw,20px);
    color:var(--cyan);letter-spacing:4px;opacity:0.7;z-index:20;
    animation:fadeIn 1s ease-out both;pointer-events:none;
  `;
  document.getElementById('ui-overlay')?.appendChild(promptEl);

  return {
    player, cockpitCam, touchControls, mouseControls, sound, hud,
    canyon, camera, dustParticles,
    altitude: 0,
    phase: 'grounded',
    orbitReached: false,
    orbitTimer: 0,
    promptEl,
  };
}

export function updateMarsLaunch(
  state: MarsLaunchState,
  keys: Record<string, boolean>,
  dt: number,
  now: number,
  scene: THREE.Scene,
): void {
  if (state.orbitReached) return;

  const { player, cockpitCam, touchControls, mouseControls, sound } = state;
  const touch = touchControls.getInput();

  // Input
  const keyYaw = (keys['ArrowRight'] ? 1 : 0) + (keys['ArrowLeft'] ? -1 : 0);
  const keyPitch = (keys['ArrowUp'] ? -1 : 0) + (keys['ArrowDown'] ? 1 : 0);
  const keyThrust = (keys['KeyE'] ? 1 : 0) + (keys['KeyD'] ? -1 : 0);
  const combinedThrust = Math.max(-1, Math.min(1, keyThrust + touch.thrust));

  const input: ShipInput = {
    yaw: Math.max(-1, Math.min(1, keyYaw + touch.yaw)),
    pitch: Math.max(-1, Math.min(1, keyPitch + touch.pitch)),
    roll: 0,
    thrust: combinedThrust,
  };

  // Remove prompt on first thrust
  if (combinedThrust > 0 && state.phase === 'grounded') {
    state.phase = 'climbing';
    if (state.promptEl) {
      state.promptEl.style.transition = 'opacity 1s';
      state.promptEl.style.opacity = '0';
      setTimeout(() => { state.promptEl?.remove(); state.promptEl = null; }, 1000);
    }
  }

  // Altitude = player Y position
  state.altitude = Math.max(0, player.position.y);

  // Atmosphere modifiers
  const atmoMods = getAtmosphereModifiers(MARS_ATMOSPHERE, state.altitude);
  applyShipPhysics(player, input, dt, now, atmoMods);

  // Prevent going below ground
  if (player.position.y < 0) {
    player.position.y = 0;
    if (player.velocity.y < 0) player.velocity.y = 0;
  }

  // Simple canyon wall collision — keep player within wall bounds
  const wallLimit = 35 + state.altitude * 0.1; // widens as you climb
  if (player.position.x < -wallLimit) {
    player.position.x = -wallLimit;
    if (player.velocity.x < 0) player.velocity.x *= -0.5;
    player.applyDamage(2, now);
    cockpitCam.shake(0.5);
  }
  if (player.position.x > wallLimit) {
    player.position.x = wallLimit;
    if (player.velocity.x > 0) player.velocity.x *= -0.5;
    player.applyDamage(2, now);
    cockpitCam.shake(0.5);
  }

  // Visuals — sky color transition
  const visuals = getAtmosphereVisuals(MARS_ATMOSPHERE, state.altitude);
  scene.background = visuals.skyColor;

  // Dust particle opacity
  (state.dustParticles.material as THREE.PointsMaterial).opacity = visuals.particleDensity * 0.4;
  // Move dust with player
  state.dustParticles.position.copy(player.position);

  // Wind sound intensity
  sound.setWindIntensity(state.altitude / MARS_ATMOSPHERE.maxAltitude);

  // Touch controls draw
  touchControls.draw();

  // Camera
  cockpitCam.update(player, dt, input.yaw);

  // HUD
  state.hud.updateAltitude(state.altitude);

  // Orbit check — above max altitude
  if (state.altitude >= MARS_ATMOSPHERE.maxAltitude && !state.orbitReached) {
    state.orbitReached = true;
    state.orbitTimer = now;
    sound.stopWindDrone();
  }
}

export function cleanupMarsLaunch(state: MarsLaunchState, scene: THREE.Scene): void {
  scene.remove(state.player.group);
  scene.remove(state.dustParticles);
  state.canyon.cleanup();
  state.touchControls.destroy();
  state.hud.destroy();
  state.promptEl?.remove();
  state.sound.stopWindDrone();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scenes/MarsLaunch.ts
git commit -m "feat: add Mars canyon launch scene with playable atmospheric flight"
```

---

## Task 9: Earth Landing Scene

**Files:**
- Create: `src/scenes/EarthLanding.ts`

- [ ] **Step 1: Create EarthLanding.ts**

```typescript
// src/scenes/EarthLanding.ts
// Playable Earth landing sequence — approach, reentry, cloud break,
// guided descent to spaceport, touchdown.

import * as THREE from 'three';
import { Ship3D } from '../entities/Ship3D';
import { createPlayerShipGeometry } from '../ships/ShipGeometry';
import { createPlayerMaterials, applyMaterials } from '../ships/ShipMaterials';
import { applyShipPhysics, type ShipInput } from '../systems/PhysicsSystem3D';
import { CockpitCamera } from '../camera/CockpitCamera';
import { TouchControls3D } from '../ui/TouchControls3D';
import { MouseControls } from '../ui/MouseControls';
import { SoundSystem } from '../systems/SoundSystem';
import { HUD3D } from '../ui/HUD3D';
import { createSpaceportTerrain, type SpaceportTerrain } from '../terrain/SpaceportGeometry';
import {
  EARTH_ATMOSPHERE,
  getAtmosphereModifiers,
  getAtmosphereVisuals,
} from '../systems/AtmosphereSystem';
import { currentCharacter, CHARACTERS } from '../state/Character';
import { COLORS, SHIP } from '../config';
import { DIFFICULTY, currentDifficulty } from '../state/Difficulty';
import { totalScore } from '../state/LevelState';

export interface EarthLandingState {
  player: Ship3D;
  cockpitCam: CockpitCamera;
  touchControls: TouchControls3D;
  mouseControls: MouseControls;
  sound: SoundSystem;
  hud: HUD3D;
  spaceport: SpaceportTerrain;
  camera: THREE.PerspectiveCamera;
  cloudLayer: THREE.Mesh;
  reentryOverlay: HTMLDivElement | null;
  altitude: number;
  phase: 'approach' | 'reentry' | 'belowClouds' | 'landing' | 'landed';
  landedTimer: number;
  missionText: HTMLDivElement | null;
}

const CLOUD_ALTITUDE = 1200;
const REENTRY_START = 2200;
const LAND_THRESHOLD = 5; // below this altitude = landed

export function createEarthLanding(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  previousScore: number,
): EarthLandingState {
  // Player ship — start high up, pointing down toward Earth
  const charConfig = CHARACTERS[currentCharacter];
  const playerColor = charConfig?.color ?? COLORS.player;
  const playerGeo = createPlayerShipGeometry();
  applyMaterials(playerGeo, createPlayerMaterials(playerColor));
  playerGeo.position.set(0, EARTH_ATMOSPHERE.maxAltitude, -300);
  playerGeo.visible = false; // cockpit view
  scene.add(playerGeo);

  const diff = DIFFICULTY[currentDifficulty];
  const player = new Ship3D({
    group: playerGeo,
    maxHull: diff.playerHull,
    maxShield: diff.playerShield,
    speedMult: 1.0,
    rotationMult: 1.0,
    isPlayer: true,
  });
  player.score = previousScore;

  // Spaceport terrain (positioned at Y=0)
  const spaceport = createSpaceportTerrain(scene);

  // Cloud layer — large translucent plane at cloud altitude
  const cloudGeo = new THREE.PlaneGeometry(8000, 8000);
  cloudGeo.rotateX(-Math.PI / 2);
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.6,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const cloudLayer = new THREE.Mesh(cloudGeo, cloudMat);
  cloudLayer.position.y = CLOUD_ALTITUDE;
  scene.add(cloudLayer);

  // Start sky as space black
  scene.background = new THREE.Color(0x010208);

  // Systems
  const cockpitCam = new CockpitCamera(camera);
  const touchControls = new TouchControls3D();
  const mouseControls = new MouseControls();
  const sound = new SoundSystem();
  sound.init();

  const hud = new HUD3D();
  hud.setMissionPhase('landing');

  // "MISSION COMPLETE" text
  const missionText = document.createElement('div');
  missionText.textContent = 'MISSION COMPLETE — RETURN HOME';
  missionText.style.cssText = `
    position:fixed;top:20%;left:50%;transform:translateX(-50%);
    font-family:var(--font-display);font-size:clamp(14px,3vw,22px);
    color:var(--gold);letter-spacing:4px;opacity:0;z-index:20;
    animation:fadeIn 2s ease-out 0.5s forwards;pointer-events:none;
  `;
  document.getElementById('ui-overlay')?.appendChild(missionText);
  // Auto-fade after 4s
  setTimeout(() => {
    if (missionText.parentNode) {
      missionText.style.transition = 'opacity 2s';
      missionText.style.opacity = '0';
      setTimeout(() => missionText.remove(), 2000);
    }
  }, 4000);

  return {
    player, cockpitCam, touchControls, mouseControls, sound, hud,
    spaceport, camera, cloudLayer,
    reentryOverlay: null,
    altitude: EARTH_ATMOSPHERE.maxAltitude,
    phase: 'approach',
    landedTimer: 0,
    missionText,
  };
}

export function updateEarthLanding(
  state: EarthLandingState,
  keys: Record<string, boolean>,
  dt: number,
  now: number,
  scene: THREE.Scene,
): void {
  if (state.phase === 'landed') {
    state.landedTimer += dt;
    return;
  }

  const { player, cockpitCam, touchControls, sound } = state;
  const touch = touchControls.getInput();

  // Input
  const keyYaw = (keys['ArrowRight'] ? 1 : 0) + (keys['ArrowLeft'] ? -1 : 0);
  const keyPitch = (keys['ArrowUp'] ? -1 : 0) + (keys['ArrowDown'] ? 1 : 0);
  const keyThrust = (keys['KeyE'] ? 1 : 0) + (keys['KeyD'] ? -1 : 0);
  const combinedThrust = Math.max(-1, Math.min(1, keyThrust + touch.thrust));

  const input: ShipInput = {
    yaw: Math.max(-1, Math.min(1, keyYaw + touch.yaw)),
    pitch: Math.max(-1, Math.min(1, keyPitch + touch.pitch)),
    roll: 0,
    thrust: combinedThrust,
  };

  // Altitude
  state.altitude = Math.max(0, player.position.y);

  // Atmosphere modifiers
  const atmoMods = getAtmosphereModifiers(EARTH_ATMOSPHERE, state.altitude);
  applyShipPhysics(player, input, dt, now, atmoMods);

  // Phase transitions
  if (state.altitude < REENTRY_START && state.phase === 'approach') {
    state.phase = 'reentry';
    sound.reentryRoar();
    // Create reentry glow overlay
    state.reentryOverlay = document.createElement('div');
    state.reentryOverlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      pointer-events:none;z-index:35;
      box-shadow:inset 0 0 150px rgba(255,100,20,0.4), inset 0 0 80px rgba(255,60,0,0.3);
      transition:opacity 3s ease-out;
    `;
    document.getElementById('ui-overlay')?.appendChild(state.reentryOverlay);
    cockpitCam.shake(1.0);
  }

  if (state.altitude < CLOUD_ALTITUDE && state.phase === 'reentry') {
    state.phase = 'belowClouds';
    // Fade reentry effect
    if (state.reentryOverlay) {
      state.reentryOverlay.style.opacity = '0';
      setTimeout(() => { state.reentryOverlay?.remove(); state.reentryOverlay = null; }, 3000);
    }
    // Show guide path
    state.spaceport.guidePathGroup.visible = true;
    sound.startWindDrone();
  }

  if (state.altitude < 200 && state.phase === 'belowClouds') {
    state.phase = 'landing';
  }

  // Gentle auto-correction toward pad when below 300m
  if (state.altitude < 300) {
    const towardPad = new THREE.Vector3(-player.position.x, 0, -player.position.z);
    const dist = towardPad.length();
    if (dist > 20) {
      towardPad.normalize();
      const nudgeStrength = 0.5 * dt * (1 - state.altitude / 300);
      player.velocity.x += towardPad.x * nudgeStrength * 10;
      player.velocity.z += towardPad.z * nudgeStrength * 10;
    }
  }

  // Near-ground: auto-flare (prevent crash)
  if (state.altitude < 15 && player.velocity.y < -5) {
    player.velocity.y *= 0.8; // heavy braking
  }

  // Touchdown
  if (player.position.y <= LAND_THRESHOLD && state.phase === 'landing') {
    player.position.y = 0;
    player.velocity.set(0, 0, 0);
    state.phase = 'landed';
    state.landedTimer = 0;
    sound.stopWindDrone();
    sound.touchdown();
    setTimeout(() => sound.landingFanfare(), 1000);
  }

  // Visuals — sky color
  const visuals = getAtmosphereVisuals(EARTH_ATMOSPHERE, state.altitude);
  scene.background = visuals.skyColor;

  // Wind intensity
  if (state.altitude < CLOUD_ALTITUDE) {
    sound.setWindIntensity(state.altitude / CLOUD_ALTITUDE);
  }

  // Pad ring pulse
  if (state.spaceport.padRing) {
    const pulse = 0.4 + 0.3 * Math.sin(now * 0.003);
    (state.spaceport.padRing.material as THREE.MeshBasicMaterial).opacity = pulse;
  }

  // Touch controls
  touchControls.draw();

  // Camera
  cockpitCam.update(player, dt, input.yaw);

  // HUD
  state.hud.updateAltitude(state.altitude);
}

/** Has the landing sequence completed (landed + delay for score screen)? */
export function isLandingComplete(state: EarthLandingState): boolean {
  return state.phase === 'landed' && state.landedTimer > 4;
}

export function cleanupEarthLanding(state: EarthLandingState, scene: THREE.Scene): void {
  scene.remove(state.player.group);
  scene.remove(state.cloudLayer);
  state.spaceport.cleanup();
  state.touchControls.destroy();
  state.hud.destroy();
  state.reentryOverlay?.remove();
  state.missionText?.remove();
  state.sound.stopWindDrone();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scenes/EarthLanding.ts
git commit -m "feat: add Earth landing scene with reentry, clouds, guided spaceport approach"
```

---

## Task 10: Wire Everything Into main.ts

**Files:**
- Modify: `src/main.ts`

This is the integration task — connecting the new scenes to the existing game flow.

- [ ] **Step 1: Add imports**

At the top of `src/main.ts`, add:

```typescript
import { createMarsLaunch, updateMarsLaunch, cleanupMarsLaunch, type MarsLaunchState } from './scenes/MarsLaunch';
import { createEarthLanding, updateEarthLanding, isLandingComplete, cleanupEarthLanding, type EarthLandingState } from './scenes/EarthLanding';
import { setMissionPhase } from './state/LevelState';
```

- [ ] **Step 2: Add state variables**

After the existing `let cinematic: CinematicState | null = null;` line, add:

```typescript
let marsLaunch: MarsLaunchState | null = null;
let earthLanding: EarthLandingState | null = null;
```

- [ ] **Step 3: Update handleSceneEnter**

Add cases for the new scenes:

```typescript
    case 'marsLaunch':
      startMarsLaunch();
      break;
    case 'earthLanding':
      startEarthLanding();
      break;
```

- [ ] **Step 4: Update handleSceneExit**

Add cleanup for the new scenes:

```typescript
  if (state === 'marsLaunch' && marsLaunch) {
    cleanupMarsLaunch(marsLaunch, bundle.scene);
    marsLaunch = null;
  }
  if (state === 'earthLanding' && earthLanding) {
    cleanupEarthLanding(earthLanding, bundle.scene);
    earthLanding = null;
  }
```

- [ ] **Step 5: Add scene start functions**

```typescript
function startMarsLaunch(): void {
  crosshairEl.style.display = 'block';
  setMissionPhase('launch');
  marsLaunch = createMarsLaunch(bundle.scene, bundle.camera);
}

function startEarthLanding(): void {
  crosshairEl.style.display = 'block';
  setMissionPhase('landing');
  earthLanding = createEarthLanding(bundle.scene, bundle.camera, totalScore);
}
```

- [ ] **Step 6: Update the game flow**

Change the character select → level intro transition to go through Mars launch first. In the `showCharSelectOverlay` function, change the click handler:

```typescript
    card.addEventListener('click', () => {
      setCharacter(id);
      sceneManager.transition('marsLaunch'); // was 'levelIntro'
    });
```

Change the final level victory transition to go to Earth landing. In the `animate()` function, find the victory handler:

```typescript
      if (hasNext) {
        sceneManager.transition('levelIntro');
      } else {
        sceneManager.transition('earthLanding'); // was 'highScore'
      }
```

- [ ] **Step 7: Add update handlers in animate()**

In the `animate()` function, add after the arena update block and before the title block:

```typescript
  } else if (sceneManager.current === 'marsLaunch' && marsLaunch) {
    updateMarsLaunch(marsLaunch, keys, dt, now, bundle.scene);
    if (marsLaunch.orbitReached && now - marsLaunch.orbitTimer > 2000) {
      // 2 second pause in orbit before transitioning to combat
      sceneManager.transition('levelIntro');
    }
  } else if (sceneManager.current === 'earthLanding' && earthLanding) {
    updateEarthLanding(earthLanding, keys, dt, now, bundle.scene);
    if (isLandingComplete(earthLanding)) {
      sceneManager.transition('highScore');
    }
```

- [ ] **Step 8: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire Mars launch and Earth landing into game flow"
```

---

## Task 11: End-to-End Playtest & Polish

**Files:**
- Various (bug fixes as discovered)

- [ ] **Step 1: Run the dev server and play through the full mission arc**

```bash
cd "/Users/johnpriday/Claude Local/OH-YUM BLASTER" && npm run dev
```

Test the full flow:
1. Title → Character Select → Mars Launch (canyon → orbit)
2. Level 1 (asteroids) → Level 2 (nebula) → Level 3 (black hole)
3. Earth Landing (approach → reentry → clouds → touchdown)
4. Score Summary

- [ ] **Step 2: Verify on mobile (iPhone)**

Open on iPhone in landscape. Test:
- Touch joystick works during launch/landing
- HUD altitude indicator visible
- "HOLD THRUST TO LAUNCH" prompt visible and dismisses
- Reentry glow overlay renders correctly
- Guide path rings visible during landing approach

- [ ] **Step 3: Fix any issues found during playtest**

Common things to check:
- Sky background resets to space black when transitioning from Mars launch to arena
- Canyon terrain is cleaned up when leaving Mars launch scene
- Earth terrain fog doesn't persist into the score screen
- Sound system wind drone stops properly on transitions
- Camera near/far planes can see both canyon walls and distant mesas (may need to increase camera far from 10000)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: playtest polish for Mars launch and Earth landing sequences"
```

- [ ] **Step 5: Push to main**

```bash
git push origin main
```
