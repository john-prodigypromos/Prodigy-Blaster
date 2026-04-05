// ── 3D Damage System — Simple distance check only ────────

import { Ship3D } from '../entities/Ship3D';
import { BoltPool, type BoltData } from '../entities/Bolt3D';
import { SHIP } from '../config';

export interface DamageEvent {
  target: Ship3D;
  bolt: BoltData;
  damage: number;
  shieldHit: boolean;
}

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
      if (bolt.isPlayer === ship.isPlayer) continue;
      if (ship.isInvincible(now)) continue;

      const dist = bolt.mesh.position.distanceTo(ship.position);
      if (dist < hitboxRadius) {
        const hadShield = ship.shield > 0;
        ship.applyDamage(bolt.damage, now);

        events.push({
          target: ship,
          bolt,
          damage: bolt.damage,
          shieldHit: hadShield,
        });

        boltPool.deactivate(bolt);
        break;
      }
    }
  }

  return events;
}
