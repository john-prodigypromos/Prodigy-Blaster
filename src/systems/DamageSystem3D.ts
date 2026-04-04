// ── 3D Damage System ─────────────────────────────────────
// Bolt-to-ship collision detection (sphere check),
// damage application, and bolt deactivation.

import { Ship3D } from '../entities/Ship3D';
import { BoltPool, type BoltData } from '../entities/Bolt3D';
import { SHIP } from '../config';

export interface DamageEvent {
  target: Ship3D;
  bolt: BoltData;
  damage: number;
  shieldHit: boolean;
}

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
    for (const ship of ships) {
      if (!ship.alive) continue;
      // Don't hit own team
      if (bolt.isPlayer === ship.isPlayer) continue;
      // I-frames check
      if (ship.isInvincible(now)) continue;

      const dist = bolt.mesh.position.distanceTo(ship.position);
      if (dist < hitboxRadius) {
        const hadShield = ship.shield > 0;
        const dmg = ship.applyDamage(bolt.damage, now);

        if (dmg > 0) {
          events.push({
            target: ship,
            bolt,
            damage: dmg,
            shieldHit: hadShield,
          });
        }

        boltPool.deactivate(bolt);
        break; // bolt can only hit one target
      }
    }
  }

  return events;
}
