import * as THREE from 'three';
import { createEnemyShipGeometry, createPlayerShipGeometry } from './ships/ShipGeometry';
import { createPlayerMaterials, createEnemyMaterials, applyMaterials } from './ships/ShipMaterials';
import { createAsteroidMesh } from './systems/EnvironmentLoader';
import { createPlanet as createPlanetFromProfile, PLANET_COUNT } from './renderer/Environment';
import { createCanyonTerrain, type CanyonTerrain } from './terrain/CanyonGeometry';

// ── Scene ──
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080e18);

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 3000000);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// ── Lighting ──
const ambientLight = new THREE.AmbientLight(0x334455, 0.5);
scene.add(ambientLight);
const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
keyLight.position.set(5, 8, 6);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x4488bb, 0.6);
fillLight.position.set(-4, 2, -3);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xff6644, 0.3);
rimLight.position.set(0, -3, -5);
scene.add(rimLight);

// Ground grid (hidden for some objects)
const grid = new THREE.GridHelper(20, 20, 0x112233, 0x0a1520);
grid.position.y = -3;
scene.add(grid);

// Subtle starfield background
const starCount = 2000;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 5000 + Math.random() * 3000;
  starPos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
  starPos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
  starPos[i * 3 + 2] = Math.cos(phi) * r;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0x667799, size: 2, sizeAttenuation: false });
scene.add(new THREE.Points(starGeo, starMat));

// ── Object State ──
let currentGroup: THREE.Group | THREE.Object3D | null = null;
let spinning = true;
let updateFn: ((dt: number, now: number) => void) | null = null;
let cleanupExtras: (() => void) | null = null;

type ViewerObject = 'player' | 'enemy' | 'asteroid' | 'blackhole' | 'planet' | 'moon' | 'marsbase';

// Per-object orbit distances
const ORBIT_DIST: Record<ViewerObject, number> = {
  player: 18,
  enemy: 16,
  asteroid: 60,
  blackhole: 600,
  planet: 1000,
  moon: 220,
  marsbase: 25000,
};

const DESCRIPTIONS: Record<ViewerObject, string> = {
  player: 'Swept-wing fighter with dual nacelles, dorsal 3rd engine, and cockpit canopy. PBR metallic hull with character-tinted accent.',
  enemy: 'Dark gunmetal interceptor with red accent lighting. Menacing cockpit slit, twin engines, and darker armor panels.',
  asteroid: 'Multi-octave noise displacement over icosahedron. Craggy rock with craters, color variation, and flat shading.',
  blackhole: 'Singularity sphere with dual-layer shader accretion disk (fbm + ridged noise). Stream particles, radial sparks, and volumetric glow.',
  planet: 'Procedural planet with atmosphere shell. 5 types cycle on click.',
  moon: 'Icy satellite with procedural crater texture and fracture lines.',
  marsbase: 'Mars canyon with geodesic dome colony on a textured planet sphere. The launch site.',
};

function clearCurrent() {
  if (currentGroup) {
    scene.remove(currentGroup);
    currentGroup = null;
  }
  if (cleanupExtras) {
    cleanupExtras();
    cleanupExtras = null;
  }
  updateFn = null;
}

// ── Object Builders ──

function loadShip(type: 'player' | 'enemy') {
  clearCurrent();
  const geo = type === 'enemy' ? createEnemyShipGeometry() : createPlayerShipGeometry();
  const mats = type === 'enemy' ? createEnemyMaterials() : createPlayerMaterials(0x00aaff);
  applyMaterials(geo, mats);

  // Center
  const box = new THREE.Box3().setFromObject(geo);
  const center = box.getCenter(new THREE.Vector3());
  geo.position.sub(center);

  currentGroup = geo;
  scene.add(geo);
  grid.visible = true;
  setLighting('ship');
}

function loadAsteroid() {
  clearCurrent();

  const { mesh } = createAsteroidMesh(18, Math.floor(Math.random() * 10000));
  currentGroup = mesh;
  scene.add(mesh);
  grid.visible = false;
  setLighting('ship');

  // Slow tumble
  updateFn = (dt) => {
    mesh.rotation.x += dt * 0.15;
    mesh.rotation.y += dt * 0.1;
  };
}

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

// ── GLSL for accretion disk ──
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

  vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
  }
  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
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
  vec3 fireColor(float t) {
    vec3 c0 = vec3(0.05, 0.0, 0.0);
    vec3 c1 = vec3(0.6, 0.1, 0.0);
    vec3 c2 = vec3(1.0, 0.4, 0.0);
    vec3 c3 = vec3(1.0, 0.75, 0.2);
    vec3 c4 = vec3(1.0, 0.95, 0.7);
    if (t < 0.2) return mix(c0, c1, t / 0.2);
    if (t < 0.4) return mix(c1, c2, (t - 0.2) / 0.2);
    if (t < 0.65) return mix(c2, c3, (t - 0.4) / 0.25);
    return mix(c3, c4, clamp((t - 0.65) / 0.35, 0.0, 1.0));
  }
  void main() {
    vec2 centered = vUv - 0.5;
    float dist = length(centered) * 2.0;
    float angle = atan(centered.y, centered.x);
    float innerR = 0.18;
    float outerR = 0.95;
    if (dist < innerR || dist > outerR) discard;
    float radialT = (dist - innerR) / (outerR - innerR);
    float spiralWind = 3.0;
    float spiralAngle = angle + radialT * spiralWind + uTime * 0.15;
    vec2 noiseUV = vec2(spiralAngle * 1.2, radialT * 4.0);
    float turb = fbm(noiseUV * 3.0 + uTime * 0.08);
    float filaments = ridgedFbm(noiseUV * 4.0 + vec2(uTime * 0.05, uTime * 0.12));
    float intensity = turb * 0.6 + filaments * 0.55;
    float radialBrightness = 1.0 - radialT * 0.7;
    intensity *= radialBrightness;
    float hotSpotDist = 1.0 - smoothstep(0.0, 1.8,
      abs(mod(angle - uHotSpotAngle + 3.14159, 6.28318) - 3.14159));
    float hotSpotRadial = smoothstep(0.0, 0.5, radialT) * smoothstep(0.8, 0.3, radialT);
    intensity += hotSpotDist * hotSpotRadial * 0.5;
    float innerGlow = smoothstep(0.15, 0.0, radialT) * 1.2;
    intensity += innerGlow;
    intensity = clamp(intensity, 0.0, 1.5);
    vec3 color = fireColor(intensity);
    color *= 1.0 + intensity * 0.8;
    float alphaInner = smoothstep(0.0, 0.06, radialT);
    float alphaOuter = 1.0 - smoothstep(0.75, 1.0, radialT);
    float alpha = alphaInner * alphaOuter * clamp(intensity * 1.5, 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
  }
`;

function loadBlackHole() {
  clearCurrent();
  const group = new THREE.Group();
  const DISK_TILT = Math.PI * 0.42;

  // 1. Singularity
  const holeMesh = new THREE.Mesh(
    new THREE.SphereGeometry(60, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x000000 }),
  );
  group.add(holeMesh);

  // 2. Outer glow
  const outerGlowTex = makeGlowTexture(512, [
    { pos: 0, color: 'rgba(255, 160, 40, 0.35)' },
    { pos: 0.12, color: 'rgba(255, 120, 20, 0.25)' },
    { pos: 0.3, color: 'rgba(200, 70, 5, 0.12)' },
    { pos: 0.55, color: 'rgba(120, 30, 0, 0.05)' },
    { pos: 0.8, color: 'rgba(40, 8, 0, 0.02)' },
    { pos: 1, color: 'rgba(0, 0, 0, 0)' },
  ]);
  const outerGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: outerGlowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  outerGlow.scale.set(1000, 1000, 1);
  group.add(outerGlow);

  // 3. Inner glow
  const innerGlowTex = makeGlowTexture(512, [
    { pos: 0, color: 'rgba(255, 240, 180, 0.6)' },
    { pos: 0.08, color: 'rgba(255, 200, 80, 0.5)' },
    { pos: 0.2, color: 'rgba(255, 140, 30, 0.3)' },
    { pos: 0.4, color: 'rgba(255, 80, 5, 0.12)' },
    { pos: 0.7, color: 'rgba(120, 30, 0, 0.03)' },
    { pos: 1, color: 'rgba(0, 0, 0, 0)' },
  ]);
  const innerGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: innerGlowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  innerGlow.scale.set(500, 500, 1);
  group.add(innerGlow);

  // 4. Shader accretion disk
  const diskUniforms = { uTime: { value: 0.0 }, uHotSpotAngle: { value: -0.8 } };
  const diskMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    new THREE.ShaderMaterial({
      uniforms: diskUniforms, vertexShader: DISK_VERTEX, fragmentShader: DISK_FRAGMENT,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  diskMesh.rotation.x = DISK_TILT;
  group.add(diskMesh);

  // 5. Second disk layer
  const disk2Mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(480, 480),
    new THREE.ShaderMaterial({
      uniforms: { uTime: diskUniforms.uTime, uHotSpotAngle: { value: -0.4 } },
      vertexShader: DISK_VERTEX, fragmentShader: DISK_FRAGMENT,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  disk2Mesh.rotation.x = DISK_TILT + 0.12;
  disk2Mesh.rotation.z = 0.25;
  group.add(disk2Mesh);

  // 6. Inner rings
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: 0xffeeaa, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(64, 3.5, 16, 128), innerRingMat);
  innerRing.rotation.x = DISK_TILT;
  group.add(innerRing);

  const innerRing2 = new THREE.Mesh(
    new THREE.TorusGeometry(68, 2, 16, 128),
    new THREE.MeshBasicMaterial({
      color: 0xffcc66, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  innerRing2.rotation.x = DISK_TILT;
  group.add(innerRing2);

  // 8. Stream particles
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
  const streamPoints = new THREE.Points(streamGeo, new THREE.PointsMaterial({
    size: 3.5, vertexColors: true, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }));
  streamPoints.rotation.x = DISK_TILT;
  group.add(streamPoints);

  // Warm lights
  const warmLight = new THREE.PointLight(0xff7700, 3.5, 1000);
  group.add(warmLight);

  currentGroup = group;
  scene.add(group);
  grid.visible = false;
  setLighting('blackhole');

  // Animation
  updateFn = (dt, now) => {
    diskUniforms.uTime.value = now;
    innerRing.rotation.z += dt * 0.08;
    innerRing2.rotation.z -= dt * 0.05;
    innerRingMat.opacity = 0.55 + 0.2 * Math.sin(now * 1.8);
    warmLight.intensity = 3.0 + 1.0 * Math.sin(now * 0.9);

    // Stream particles
    const posArr = streamGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < STREAM_COUNT; i++) {
      streamAngles[i] += dt * streamSpeeds[i] * (180 / Math.max(streamRadii[i], 60));
      streamRadii[i] -= dt * 3;
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
  };
}

let planetViewerIndex = 0;
const PLANET_NAMES = ['VENUS', 'ICE GIANT', 'RED DESERT', 'OCEAN WORLD', 'GAS GIANT'];

function loadPlanet() {
  clearCurrent();

  // createPlanetFromProfile adds to scene and positions — we need to undo that
  const group = createPlanetFromProfile(scene, planetViewerIndex);
  group.position.set(0, 0, 0); // reset to origin for viewer
  currentGroup = group;
  grid.visible = false;
  setLighting('planet');

  // Update label with planet type name
  document.getElementById('label')!.textContent = PLANET_NAMES[planetViewerIndex % PLANET_NAMES.length];

  // Find the planet mesh for rotation
  const planetMesh = group.children.find(c => c instanceof THREE.Mesh && (c as THREE.Mesh).geometry instanceof THREE.SphereGeometry) as THREE.Mesh | undefined;
  updateFn = (dt) => {
    if (planetMesh) planetMesh.rotation.y += dt * 0.03;
  };

  // Cycle to next type for next click
  planetViewerIndex = (planetViewerIndex + 1) % PLANET_COUNT;
}

function seededRng(seed: number) {
  return () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function loadMoon() {
  clearCurrent();
  const group = new THREE.Group();
  const rng = seededRng(628);
  const W = 1024, H = 512;

  const moonCanvas = document.createElement('canvas');
  moonCanvas.width = W;
  moonCanvas.height = H;
  const ctx = moonCanvas.getContext('2d')!;

  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0.0, '#d8e8f0');
  base.addColorStop(0.2, '#c0d8e8');
  base.addColorStop(0.4, '#a8c8d8');
  base.addColorStop(0.6, '#b0d0e0');
  base.addColorStop(0.8, '#c8dce8');
  base.addColorStop(1.0, '#d0e0ec');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 25; i++) {
    const cx = rng() * W, cy = rng() * H, cr = 4 + rng() * 20;
    const cg = ctx.createRadialGradient(cx, cy, cr * 0.2, cx, cy, cr);
    cg.addColorStop(0, `rgba(100, 120, 140, ${0.15 + rng() * 0.15})`);
    cg.addColorStop(0.7, `rgba(80, 100, 120, ${0.05 + rng() * 0.1})`);
    cg.addColorStop(1, 'rgba(80, 100, 120, 0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(160, 200, 220, 0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 15; i++) {
    ctx.beginPath();
    ctx.moveTo(rng() * W, rng() * H);
    for (let j = 0; j < 4; j++) ctx.lineTo(rng() * W, rng() * H);
    ctx.stroke();
  }

  const moonFallback = new THREE.CanvasTexture(moonCanvas);
  moonFallback.wrapS = THREE.RepeatWrapping;
  moonFallback.anisotropy = 4;

  const moonMat = new THREE.MeshStandardMaterial({ map: moonFallback, metalness: 0.1, roughness: 0.7 });

  const moonLoader = new THREE.TextureLoader();
  moonLoader.load('/textures/ice_moon.png', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    moonMat.map = tex;
    moonMat.needsUpdate = true;
  });

  const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(60, 64, 48), moonMat);
  group.add(moonMesh);

  currentGroup = group;
  scene.add(group);
  grid.visible = false;
  setLighting('planet');

  updateFn = (dt) => {
    moonMesh.rotation.y += dt * 0.02;
  };
}

// ── Lighting presets ──
function setLighting(mode: 'ship' | 'blackhole' | 'planet') {
  switch (mode) {
    case 'ship':
      ambientLight.intensity = 0.5;
      keyLight.intensity = 1.8;
      fillLight.intensity = 0.6;
      rimLight.intensity = 0.3;
      break;
    case 'blackhole':
      ambientLight.intensity = 0.15;
      keyLight.intensity = 0.3;
      fillLight.intensity = 0.1;
      rimLight.intensity = 0.1;
      break;
    case 'planet':
      ambientLight.intensity = 0.3;
      keyLight.intensity = 2.5;
      keyLight.position.set(500, 300, 400);
      fillLight.intensity = 0.2;
      rimLight.intensity = 0.1;
      break;
  }
}

// ── Mars Base loader ──
let canyonRef: CanyonTerrain | null = null;

function loadMarsBase() {
  clearCurrent();
  if (canyonRef) {
    canyonRef.cleanup();
    canyonRef = null;
  }

  canyonRef = createCanyonTerrain(scene, 42);
  scene.add(canyonRef.group);
  currentGroup = canyonRef.group;
  // Orbit around the canyon center (canyon is centered at origin, floor at y=0)
  // Camera will orbit looking at a point above the canyon floor
  grid.visible = false;
  setLighting('planet');
  // Brighter Mars sun
  keyLight.position.set(3000, 2000, -1000);
  keyLight.intensity = 2.0;
  ambientLight.intensity = 0.5;

  updateFn = null; // static scene, just orbit
  // Override cleanup to also clean canyon
  cleanupExtras = () => {
    if (canyonRef) {
      canyonRef.cleanup();
      canyonRef = null;
    }
  };
}

// ── Loader dispatch ──
const loaders: Record<ViewerObject, () => void> = {
  player: () => loadShip('player'),
  enemy: () => loadShip('enemy'),
  asteroid: loadAsteroid,
  blackhole: loadBlackHole,
  planet: loadPlanet,
  moon: loadMoon,
  marsbase: loadMarsBase,
};

let currentType: ViewerObject = 'player';

function switchTo(type: ViewerObject) {
  currentType = type;
  orbitDist = ORBIT_DIST[type];
  loaders[type]();
  document.getElementById('label')!.textContent = {
    player: 'PLAYER SHIP',
    enemy: 'ENEMY SHIP',
    asteroid: 'ASTEROID',
    blackhole: 'BLACK HOLE',
    planet: 'VENUS PLANET',
    moon: 'ICE MOON',
    marsbase: 'MARS BASE',
  }[type];
  document.getElementById('info')!.textContent = DESCRIPTIONS[type];

  // Update button states
  for (const key of Object.keys(loaders)) {
    const btn = document.getElementById(`btn-${key}`);
    if (btn) btn.className = key === type ? 'active' : '';
  }
}

// ── Orbit controls ──
let isDragging = false;
let prevMouse = { x: 0, y: 0 };
let orbitAngleX = 0;
let orbitAngleY = 0.3;
let orbitDist = ORBIT_DIST.player;

renderer.domElement.addEventListener('pointerdown', (e) => {
  isDragging = true;
  prevMouse = { x: e.clientX, y: e.clientY };
});
window.addEventListener('pointerup', () => { isDragging = false; });
window.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  orbitAngleX -= (e.clientX - prevMouse.x) * 0.005;
  orbitAngleY = Math.max(-1.2, Math.min(1.2, orbitAngleY - (e.clientY - prevMouse.y) * 0.005));
  prevMouse = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener('wheel', (e) => {
  const min = ORBIT_DIST[currentType] * 0.1;
  const max = ORBIT_DIST[currentType] * 10;
  orbitDist = Math.max(min, Math.min(max, orbitDist + e.deltaY * orbitDist * 0.001));
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Animate ──
let lastTime = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now() / 1000;
  const dt = Math.min(now - lastTime, 0.05);
  lastTime = now;

  if (spinning) orbitAngleX += 0.003;

  camera.position.set(
    Math.sin(orbitAngleX) * Math.cos(orbitAngleY) * orbitDist,
    Math.sin(orbitAngleY) * orbitDist,
    Math.cos(orbitAngleX) * Math.cos(orbitAngleY) * orbitDist,
  );
  camera.lookAt(0, 0, 0);

  if (updateFn) updateFn(dt, now);

  renderer.render(scene, camera);
}
animate();

// ── Button handlers ──
for (const type of ['player', 'enemy', 'asteroid', 'blackhole', 'planet', 'moon', 'marsbase'] as ViewerObject[]) {
  document.getElementById(`btn-${type}`)?.addEventListener('click', () => switchTo(type));
}

document.getElementById('btn-spin')!.addEventListener('click', () => {
  spinning = !spinning;
  document.getElementById('btn-spin')!.textContent = spinning ? 'PAUSE SPIN' : 'RESUME SPIN';
  document.getElementById('btn-spin')!.className = spinning ? '' : 'active';
});

// Initial load
switchTo('player');
