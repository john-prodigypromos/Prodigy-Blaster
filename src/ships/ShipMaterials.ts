// ── Ship PBR Materials ───────────────────────────────────
// Metallic materials with procedural normal + roughness maps,
// environment reflections, and emissive engines.

import * as THREE from 'three';
import { createNormalMap, createRoughnessMap } from '../renderer/ProceduralTextures';

// Shared textures (created once, reused)
let normalMap: THREE.CanvasTexture | null = null;
let roughnessMap: THREE.CanvasTexture | null = null;

function getSharedTextures() {
  if (!normalMap) normalMap = createNormalMap(1024, 101);
  if (!roughnessMap) roughnessMap = createRoughnessMap(1024, 202);
  return { normalMap, roughnessMap };
}

export interface ShipMaterialSet {
  hull: THREE.MeshPhysicalMaterial;
  cockpit: THREE.MeshPhysicalMaterial;
  engine: THREE.MeshStandardMaterial;
  nozzle: THREE.MeshBasicMaterial;
  engineLight: THREE.PointLight;
  accent?: THREE.MeshStandardMaterial;     // red accent strip lighting
  armorDark?: THREE.MeshPhysicalMaterial;  // darker armor panels
}

/** Player ship materials — blue-steel metallic with cyan engine glow. */
export function createPlayerMaterials(characterColor?: number): ShipMaterialSet {
  const { normalMap, roughnessMap } = getSharedTextures();
  const baseColor = characterColor ?? 0x88aacc;

  const hull = new THREE.MeshPhysicalMaterial({
    color: baseColor,
    metalness: 0.6,
    roughness: 0.6,
    normalMap: normalMap,
    roughnessMap: roughnessMap,
    clearcoat: 0.1,
    clearcoatRoughness: 0.4,
  });

  const cockpit = new THREE.MeshPhysicalMaterial({
    color: 0x112244,
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.6,
    thickness: 0.5,
    ior: 1.5,
  });

  const engine = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.9,
    roughness: 0.5,
    emissive: 0x0088ff,
    emissiveIntensity: 2.0,
  });

  const nozzle = new THREE.MeshBasicMaterial({
    color: 0x0088ff,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });

  const engineLight = new THREE.PointLight(0x0088ff, 5, 80, 2);

  return { hull, cockpit, engine, nozzle, engineLight };
}

/** Enemy ship materials — dark gunmetal hull, red accent lighting, bright engine glow.
 *  Inspired by cinematic sci-fi fighters: dark industrial metal with menacing red strips. */
export function createEnemyMaterials(): ShipMaterialSet {
  const { normalMap, roughnessMap } = getSharedTextures();

  // Main hull — dark gunmetal steel, almost black with subtle metallic sheen
  const hull = new THREE.MeshPhysicalMaterial({
    color: 0x1a1a22,
    emissive: 0x050508,
    emissiveIntensity: 0.3,
    metalness: 0.85,
    roughness: 0.35,
    normalMap: normalMap,
    roughnessMap: roughnessMap,
    clearcoat: 0.4,
    clearcoatRoughness: 0.15,
  });

  // Darker armor panels — even darker for panel contrast
  const armorDark = new THREE.MeshPhysicalMaterial({
    color: 0x111118,
    metalness: 0.9,
    roughness: 0.25,
    normalMap: normalMap,
    roughnessMap: roughnessMap,
    clearcoat: 0.5,
    clearcoatRoughness: 0.1,
  });

  // Cockpit slit — menacing red glow
  const cockpit = new THREE.MeshPhysicalMaterial({
    color: 0x220000,
    emissive: 0xff1111,
    emissiveIntensity: 2.5,
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.2,
    thickness: 0.3,
  });

  // Red accent strip material — subtle edge lighting
  const accent = new THREE.MeshStandardMaterial({
    color: 0x110000,
    emissive: 0xff2200,
    emissiveIntensity: 1.5,
    metalness: 0.2,
    roughness: 0.3,
  });

  // Engine core — subdued orange glow
  const engine = new THREE.MeshStandardMaterial({
    color: 0x222222,
    metalness: 0.9,
    roughness: 0.3,
    emissive: 0xff6622,
    emissiveIntensity: 1.2,
  });

  // Nozzle — dimmer exhaust
  const nozzle = new THREE.MeshBasicMaterial({
    color: 0xff8844,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });

  // Engine light — subtle cast, not blinding
  const engineLight = new THREE.PointLight(0xff4400, 3, 80, 2);

  return { hull, cockpit, engine, nozzle, engineLight, accent, armorDark };
}

/** Apply materials to a ship geometry group by mesh name. */
export function applyMaterials(group: THREE.Group, mats: ShipMaterialSet): void {
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const name = child.name;
    if (name === 'cockpit') {
      child.material = mats.cockpit;
    } else if (name.startsWith('nozzle')) {
      child.material = mats.nozzle;
    } else if (name.startsWith('engine')) {
      child.material = mats.engine;
    } else if (name.startsWith('accent') && mats.accent) {
      child.material = mats.accent;
    } else if (name.startsWith('armor-dark') && mats.armorDark) {
      child.material = mats.armorDark;
    } else {
      child.material = mats.hull;
    }
  });

  // Attach engine point light
  const engineMesh = group.children.find(c => c.name === 'engine-left' || c.name === 'engine');
  if (engineMesh) {
    const light = mats.engineLight;
    light.position.copy(engineMesh.position);
    light.position.z -= 1; // behind the engine
    group.add(light);
  }
}
