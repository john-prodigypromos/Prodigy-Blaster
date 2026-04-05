// ── 3D Weapon System ─────────────────────────────────────
// Player bolts auto-aim toward nearest enemy.
// Enemy bolts aim at the player.

import * as THREE from 'three';
import { Ship3D } from '../entities/Ship3D';
import { BoltPool } from '../entities/Bolt3D';
import { WEAPONS } from '../config';

const PLAYER_BOLT_OFFSETS = [
  new THREE.Vector3(-1.2, -0.1, 4),
  new THREE.Vector3(1.2, -0.1, 4),
];

const ENEMY_BOLT_OFFSET = new THREE.Vector3(0, 0, 3);

const _offset = new THREE.Vector3();
const _dir = new THREE.Vector3();

export function tryFireWeapon(
  ship: Ship3D,
  pool: BoltPool,
  now: number,
  fireRate?: number,
  target?: Ship3D,
): boolean {
  const rate = fireRate ?? WEAPONS.BLASTER_FIRE_RATE;
  if (now - ship.lastFireTime < rate) return false;
  ship.lastFireTime = now;

  // Enemy ships can only fire from the front — check if target is in forward cone
  if (!ship.isPlayer && target && target.alive) {
    const toTarget = target.position.clone().sub(ship.position).normalize();
    const forward = ship.getForward();
    const dot = forward.dot(toTarget);
    if (dot < 0.3) return false; // target is behind or far to the side (~72 degree half-cone)
  }

  const offsets = ship.isPlayer ? PLAYER_BOLT_OFFSETS : [ENEMY_BOLT_OFFSET];

  for (const localOffset of offsets) {
    _offset.copy(localOffset).applyQuaternion(ship.group.quaternion);
    const spawnPos = ship.position.clone().add(_offset);

    // Aim at target if provided, otherwise fire forward
    if (target && target.alive) {
      _dir.subVectors(target.position, spawnPos).normalize();
    } else {
      _dir.copy(ship.getForward());
    }

    // Small spread
    const spreadRad = (WEAPONS.BLASTER_SPREAD * Math.PI) / 180;
    _dir.x += (Math.random() - 0.5) * spreadRad;
    _dir.y += (Math.random() - 0.5) * spreadRad;
    _dir.normalize();

    pool.fire(spawnPos, _dir, ship.isPlayer);
  }

  return true;
}
