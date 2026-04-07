// ── Flyby Cinematic ──────────────────────────────────────
// 5-second dramatic entrance: camera sweeps past the player
// ship as it flies into the arena. Uses the existing space
// environment — no extra geometry needed.

import * as THREE from 'three';
import { createPlayerShipGeometry } from '../ships/ShipGeometry';
import { createPlayerMaterials, applyMaterials } from '../ships/ShipMaterials';
import { currentCharacter } from '../state/Character';
import { COLORS } from '../config';

export interface CinematicState {
  ship: THREE.Group;
  elapsed: number;
  duration: number;
  done: boolean;
}

const DURATION = 5;

export function createCinematic(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): CinematicState {
  // Player ship — visible for the flyby
  const playerColor = currentCharacter === 'william' ? 0xccaa44 : COLORS.player;
  const ship = createPlayerShipGeometry();
  applyMaterials(ship, createPlayerMaterials(playerColor));
  ship.scale.set(3, 3, 3);

  // Start far away, flying toward camera
  ship.position.set(0, 0, -300);
  ship.rotation.set(0, 0, 0); // facing +Z (toward camera)
  scene.add(ship);

  // Camera starts looking at the ship from a side angle
  camera.position.set(40, 15, -280);
  camera.lookAt(ship.position);

  return {
    ship,
    elapsed: 0,
    duration: DURATION,
    done: false,
  };
}

export function updateCinematic(
  state: CinematicState,
  camera: THREE.PerspectiveCamera,
  dt: number,
): void {
  if (state.done) return;
  state.elapsed += dt;
  const t = state.elapsed;
  const p = t / state.duration; // 0 → 1

  // Ship flies forward at increasing speed
  const speed = 60 + p * 140; // accelerating
  state.ship.position.z += speed * dt;

  // Slight bank for drama
  state.ship.rotation.z = Math.sin(p * Math.PI) * 0.15;
  // Subtle pitch up as it accelerates
  state.ship.rotation.x = -p * 0.1;

  if (p < 0.4) {
    // Phase 1 (0-2s): Camera alongside, tracking — hero shot
    const shipPos = state.ship.position;
    camera.position.set(
      30 - p * 20,
      10 + p * 10,
      shipPos.z + 15,
    );
    camera.lookAt(shipPos.x, shipPos.y + 2, shipPos.z);

  } else if (p < 0.7) {
    // Phase 2 (2-3.5s): Camera swings around to behind — over-the-shoulder
    const subP = (p - 0.4) / 0.3;
    const shipPos = state.ship.position;
    const angle = subP * Math.PI * 0.6; // sweep around
    camera.position.set(
      Math.cos(angle) * (25 - subP * 10),
      8 + subP * 5,
      shipPos.z - 10 - subP * 15,
    );
    camera.lookAt(shipPos.x, shipPos.y + 1, shipPos.z + 20);

  } else {
    // Phase 3 (3.5-5s): Camera settles behind ship — transition to cockpit view
    const subP = (p - 0.7) / 0.3;
    const shipPos = state.ship.position;
    camera.position.set(
      (1 - subP) * 8,
      5 - subP * 3,
      shipPos.z - 20 + subP * 10,
    );
    camera.lookAt(shipPos.x, shipPos.y, shipPos.z + 30);
  }

  if (t >= state.duration) {
    state.done = true;
  }
}

export function cleanupCinematic(state: CinematicState, scene: THREE.Scene): void {
  scene.remove(state.ship);
}
