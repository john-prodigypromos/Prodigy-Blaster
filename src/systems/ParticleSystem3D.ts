// ── Particle System (Three.js) ───────────────────────────
// GPU-friendly particles for engine trails, hit sparks,
// ship destruction chunks, and speed lines. Uses object
// pooling — no per-frame allocation.

import * as THREE from 'three';

// ── Types ──

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;       // seconds remaining
  maxLife: number;
  size: number;
  color: THREE.Color;
  active: boolean;
}

interface Chunk {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVel: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

// ── Constants ──

const MAX_PARTICLES = 600;
const MAX_CHUNKS = 48;    // 8 chunks × 6 possible simultaneous deaths

// ── Irregular debris geometries — warped shapes that look like torn hull ──
function createDebrisGeo(seed: number): THREE.BufferGeometry {
  // Start with a low-poly icosahedron and mangle it
  const base = new THREE.IcosahedronGeometry(1.5, 0);
  const pos = base.attributes.position;

  // Flatten one axis + random vertex displacement for shard-like shapes
  const flatAxis = seed % 3; // 0=x, 1=y, 2=z
  const squash = 0.2 + (seed * 0.17 % 0.4); // 0.2-0.6 squash factor

  for (let v = 0; v < pos.count; v++) {
    let x = pos.getX(v);
    let y = pos.getY(v);
    let z = pos.getZ(v);

    // Squash one axis to make it flat/shard-like
    if (flatAxis === 0) x *= squash;
    else if (flatAxis === 1) y *= squash;
    else z *= squash;

    // Stretch another axis for elongated fragments
    const stretchAxis = (flatAxis + 1) % 3;
    const stretch = 1.2 + (seed * 0.31 % 0.8);
    if (stretchAxis === 0) x *= stretch;
    else if (stretchAxis === 1) y *= stretch;
    else z *= stretch;

    // Random vertex jitter for irregular edges
    const jit = 0.3;
    const hash = Math.sin(v * 127.1 + seed * 311.7) * 43758.5453;
    const noise = (hash - Math.floor(hash)) * 2 - 1;
    x += noise * jit;
    y += Math.sin(v * 74.7 + seed) * jit;
    z += Math.cos(v * 53.3 + seed) * jit;

    pos.setXYZ(v, x, y, z);
  }

  base.computeVertexNormals();
  return base;
}

const CHUNK_GEOS = [
  createDebrisGeo(1),
  createDebrisGeo(2),
  createDebrisGeo(3),
  createDebrisGeo(4),
  createDebrisGeo(5),
  createDebrisGeo(6),
];

export class ParticleSystem3D {
  private particles: Particle[] = [];
  private chunks: Chunk[] = [];
  private scene: THREE.Scene;

  // Points mesh for small particles
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private pointsGeo: THREE.BufferGeometry;
  private pointsMesh: THREE.Points;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // ── Pre-allocate particle pool ──
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0,
        size: 1,
        color: new THREE.Color(1, 1, 1),
        active: false,
      });
    }

    // ── Points buffer ──
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);

    this.pointsGeo = new THREE.BufferGeometry();
    this.pointsGeo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.pointsGeo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.pointsGeo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    const pointsMat = new THREE.PointsMaterial({
      size: 2,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.pointsMesh = new THREE.Points(this.pointsGeo, pointsMat);
    this.pointsMesh.frustumCulled = false;
    scene.add(this.pointsMesh);

    // ── Pre-allocate chunk pool ──
    for (let i = 0; i < MAX_CHUNKS; i++) {
      const geoIdx = i % CHUNK_GEOS.length;
      const mat = new THREE.MeshStandardMaterial({
        color: 0x1a1a22,
        metalness: 0.7,
        roughness: 0.4,
        emissive: 0xff4400,
        emissiveIntensity: 0.8, // starts hot, fades with opacity
        transparent: true,
        opacity: 1,
        flatShading: true,
      });
      const mesh = new THREE.Mesh(CHUNK_GEOS[geoIdx], mat);
      mesh.visible = false;
      scene.add(mesh);

      this.chunks.push({
        mesh,
        velocity: new THREE.Vector3(),
        angularVel: new THREE.Vector3(),
        life: 0,
        maxLife: 2,
        active: false,
      });
    }
  }

  // ── Spawn helpers ──

  private getParticle(): Particle | null {
    for (const p of this.particles) {
      if (!p.active) return p;
    }
    return null;
  }

  private getChunk(): Chunk | null {
    for (const c of this.chunks) {
      if (!c.active) return c;
    }
    return null;
  }

  // ── Ship Destruction — 5-8 tumbling chunks + white flash + shockwave ──

  spawnDestruction(position: THREE.Vector3, hullColor: number): void {
    const count = 5 + Math.floor(Math.random() * 4); // 5-8 chunks

    for (let i = 0; i < count; i++) {
      const chunk = this.getChunk();
      if (!chunk) break;

      chunk.active = true;
      chunk.life = 2.0;
      chunk.maxLife = 2.0;

      // Position at death point with small scatter
      chunk.mesh.position.copy(position);
      chunk.mesh.position.x += (Math.random() - 0.5) * 6;
      chunk.mesh.position.y += (Math.random() - 0.5) * 6;
      chunk.mesh.position.z += (Math.random() - 0.5) * 6;

      // Random outward velocity
      chunk.velocity.set(
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 80,
      );

      // Random spin
      chunk.angularVel.set(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
      );

      // Random scale
      const s = 0.6 + Math.random() * 1.2;
      chunk.mesh.scale.set(s, s, s);

      // Use hull color
      (chunk.mesh.material as THREE.MeshStandardMaterial).color.setHex(hullColor);
      (chunk.mesh.material as THREE.MeshStandardMaterial).opacity = 1;
      chunk.mesh.visible = true;
    }

    // Bright flash particles at death point
    for (let i = 0; i < 20; i++) {
      const p = this.getParticle();
      if (!p) break;
      p.active = true;
      p.life = 0.3 + Math.random() * 0.3;
      p.maxLife = p.life;
      p.size = 4 + Math.random() * 6;
      p.color.setRGB(1, 0.95, 0.8); // white-hot
      p.position.copy(position);
      p.velocity.set(
        (Math.random() - 0.5) * 120,
        (Math.random() - 0.5) * 120,
        (Math.random() - 0.5) * 120,
      );
    }
  }

  // ── Engine Trail — thin glowing streak behind a ship ──

  spawnEngineTrail(position: THREE.Vector3, forward: THREE.Vector3, isPlayer: boolean): void {
    const p = this.getParticle();
    if (!p) return;

    p.active = true;
    p.life = 0.8 + Math.random() * 0.4;
    p.maxLife = p.life;
    p.size = isPlayer ? 1.5 : 1.2;

    // Spawn slightly behind the ship
    p.position.copy(position);
    p.position.addScaledVector(forward, -4);
    p.position.x += (Math.random() - 0.5) * 1;
    p.position.y += (Math.random() - 0.5) * 1;
    p.position.z += (Math.random() - 0.5) * 1;

    // Slight backward drift
    p.velocity.copy(forward).multiplyScalar(-15);

    if (isPlayer) {
      p.color.setRGB(0, 0.87, 1); // cyan #00ddff
    } else {
      p.color.setRGB(1, 0.27, 0.13); // orange-red #ff4422
    }
  }

  // ── Hull Hit Sparks — spray from impact point ──

  spawnHitSparks(position: THREE.Vector3, normal: THREE.Vector3): void {
    const count = 8 + Math.floor(Math.random() * 5); // 8-12

    for (let i = 0; i < count; i++) {
      const p = this.getParticle();
      if (!p) break;

      p.active = true;
      p.life = 0.3 + Math.random() * 0.2;
      p.maxLife = p.life;
      p.size = 0.8 + Math.random() * 1.5;

      p.position.copy(position);

      // Spray outward from hit normal with randomness
      p.velocity.copy(normal).multiplyScalar(40 + Math.random() * 60);
      p.velocity.x += (Math.random() - 0.5) * 50;
      p.velocity.y += (Math.random() - 0.5) * 50;
      p.velocity.z += (Math.random() - 0.5) * 50;

      // Orange-yellow spark color
      const bright = 0.7 + Math.random() * 0.3;
      p.color.setRGB(1, 0.5 + Math.random() * 0.3, bright * 0.1);
    }
  }

  // ── Shockwave Ring — expanding additive ring (uses particles in a ring pattern) ──

  spawnShockwave(position: THREE.Vector3): void {
    const ringCount = 24;
    for (let i = 0; i < ringCount; i++) {
      const p = this.getParticle();
      if (!p) break;

      const angle = (i / ringCount) * Math.PI * 2;
      p.active = true;
      p.life = 1.0;
      p.maxLife = 1.0;
      p.size = 3;
      p.color.setRGB(1, 0.9, 0.7);
      p.position.copy(position);

      // Expand outward in a ring on the XZ plane
      const speed = 80 + Math.random() * 20;
      p.velocity.set(
        Math.cos(angle) * speed,
        (Math.random() - 0.5) * 10,
        Math.sin(angle) * speed,
      );
    }
  }

  // ── Update all particles and chunks ──

  update(dt: number): void {
    let activeCount = 0;

    // Update particles
    for (const p of this.particles) {
      if (!p.active) {
        // Zero out inactive slots
        if (activeCount < MAX_PARTICLES) {
          const i3 = activeCount * 3;
          this.sizes[activeCount] = 0;
          this.positions[i3] = 0;
          this.positions[i3 + 1] = 0;
          this.positions[i3 + 2] = 0;
        }
        activeCount++;
        continue;
      }

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        if (activeCount < MAX_PARTICLES) {
          this.sizes[activeCount] = 0;
        }
        activeCount++;
        continue;
      }

      // Move
      p.position.addScaledVector(p.velocity, dt);

      // Drag on velocity
      p.velocity.multiplyScalar(0.97);

      // Fade based on remaining life
      const lifeFrac = p.life / p.maxLife;

      // Write to buffer
      if (activeCount < MAX_PARTICLES) {
        const i3 = activeCount * 3;
        this.positions[i3] = p.position.x;
        this.positions[i3 + 1] = p.position.y;
        this.positions[i3 + 2] = p.position.z;
        this.colors[i3] = p.color.r * lifeFrac;
        this.colors[i3 + 1] = p.color.g * lifeFrac;
        this.colors[i3 + 2] = p.color.b * lifeFrac;
        this.sizes[activeCount] = p.size * lifeFrac;
      }
      activeCount++;
    }

    // Mark buffers dirty
    (this.pointsGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.pointsGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.pointsGeo.attributes.size as THREE.BufferAttribute).needsUpdate = true;

    // Update chunks
    for (const chunk of this.chunks) {
      if (!chunk.active) continue;

      chunk.life -= dt;
      if (chunk.life <= 0) {
        chunk.active = false;
        chunk.mesh.visible = false;
        continue;
      }

      // Move
      chunk.mesh.position.addScaledVector(chunk.velocity, dt);

      // Rotate (tumble)
      chunk.mesh.rotation.x += chunk.angularVel.x * dt;
      chunk.mesh.rotation.y += chunk.angularVel.y * dt;
      chunk.mesh.rotation.z += chunk.angularVel.z * dt;

      // Slow down
      chunk.velocity.multiplyScalar(0.98);

      // Fade out + cool down emissive glow
      const lifeFrac = chunk.life / chunk.maxLife;
      const mat = chunk.mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = lifeFrac;
      mat.emissiveIntensity = lifeFrac * 0.8; // hot → cold
    }
  }

  // ── Cleanup ──

  destroy(): void {
    this.scene.remove(this.pointsMesh);
    this.pointsGeo.dispose();
    for (const chunk of this.chunks) {
      this.scene.remove(chunk.mesh);
      (chunk.mesh.material as THREE.Material).dispose();
    }
  }
}
