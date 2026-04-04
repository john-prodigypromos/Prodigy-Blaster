// ── 3D Damage System ─────────────────────────────────────
// Bolt-to-ship collision using both point check AND swept ray
// so fast bolts can't skip through enemies.

import * as THREE from 'three';
import { Ship3D } from '../entities/Ship3D';
import { BoltPool, type BoltData } from '../entities/Bolt3D';
import { SHIP, WEAPONS } from '../config';

export interface DamageEvent {
  target: Ship3D;
  bolt: BoltData;
  damage: number;
  shieldHit: boolean;
}

const _ray = new THREE.Ray();
const _toShip = new THREE.Vector3();

/** Check all active bolts against all ships. Returns damage events. */
export function processBoltDamage(
  boltPool: BoltPool,
  ships: Ship3D[],
  now: number,
  hitboxRadius = SHIP.HITBOX_RADIUS,
): DamageEvent[] {
  const events: DamageEvent[] = [];
  const activeBolts = boltPool.getActive();

  for (const bolt of activeBolts) {
    let hit = false;

    for (const ship of ships) {
      if (!ship.alive) continue;
      if (bolt.isPlayer === ship.isPlayer) continue;
      if (ship.isInvincible(now)) continue;

      // Method 1: Simple distance check
      const dist = bolt.mesh.position.distanceTo(ship.position);
      if (dist < hitboxRadius) {
        hit = true;
      }

      // Method 2: Ray sweep — check if bolt's travel path this frame
      // passed through the ship's hitbox sphere
      if (!hit) {
        _ray.origin.copy(bolt.mesh.position);
        _ray.direction.copy(bolt.velocity).normalize();
        _toShip.subVectors(ship.position, bolt.mesh.position);
        const projLen = _toShip.dot(_ray.direction);

        // Only check if ship is ahead of bolt (not behind)
        if (projLen > 0 && projLen < WEAPONS.BLASTER_BOLT_SPEED * 0.02) {
          // Closest point on ray to ship center
          const closest = _ray.direction.clone().multiplyScalar(projLen).add(_ray.origin);
          const closestDist = closest.distanceTo(ship.position);
          if (closestDist < hitboxRadius) {
            hit = true;
          }
        }
      }

      if (hit) {
        const hadShield = ship.shield > 0;
        const dmg = ship.applyDamage(bolt.damage, now);

        if (dmg > 0) {
          events.push({ target: ship, bolt, damage: dmg, shieldHit: hadShield });
        }

        boltPool.deactivate(bolt);
        break;
      }
    }
  }

  return events;
}
