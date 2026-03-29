import { Ship } from '../entities/Ship';
import { Bolt } from '../entities/Bolt';
import { SHIP, PHYSICS } from '../config';

export class DamageSystem {
  checkBoltHits(bolts: Bolt[], target: Ship, targetOwner: 'player' | 'enemy'): Bolt[] {
    if (!target.alive || target.isInvincible) return [];

    const hits: Bolt[] = [];
    const hitRadius = SHIP.HITBOX_RADIUS;

    for (const bolt of bolts) {
      if (!bolt.alive) continue;
      if (bolt.owner === targetOwner) continue; // skip friendly fire

      const dx = bolt.sprite.x - target.sprite.x;
      const dy = bolt.sprite.y - target.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < hitRadius + 4) {
        hits.push(bolt);
      }
    }

    return hits;
  }

  applyBoltDamage(target: Ship, bolt: Bolt, time: number): void {
    if (target.isInvincible) return;

    target.applyDamage(bolt.damage, false, time);
    target.iframesUntil = time + SHIP.IFRAMES;

    const angle = bolt.sprite.rotation - Math.PI / 2;
    target.velocityX += Math.cos(angle) * SHIP.KNOCKBACK_FORCE;
    target.velocityY += Math.sin(angle) * SHIP.KNOCKBACK_FORCE;
  }

  checkShipCollision(a: Ship, b: Ship, time: number): boolean {
    if (!a.alive || !b.alive) return false;

    const dx = a.sprite.x - b.sprite.x;
    const dy = a.sprite.y - b.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = SHIP.HITBOX_RADIUS * 2;

    if (dist >= minDist) return false;

    const relVx = a.velocityX - b.velocityX;
    const relVy = a.velocityY - b.velocityY;
    const relSpeed = Math.sqrt(relVx * relVx + relVy * relVy);
    const damage = Math.max(1, Math.floor(relSpeed * PHYSICS.COLLISION_DAMAGE_MULTIPLIER));

    if (!a.isInvincible) {
      a.applyDamage(damage, false, time);
      a.iframesUntil = time + SHIP.IFRAMES;
    }
    if (!b.isInvincible) {
      b.applyDamage(damage, false, time);
      b.iframesUntil = time + SHIP.IFRAMES;
    }

    const overlap = minDist - dist;
    const nx = dx / (dist || 1);
    const ny = dy / (dist || 1);
    a.sprite.x += nx * overlap / 2;
    a.sprite.y += ny * overlap / 2;
    b.sprite.x -= nx * overlap / 2;
    b.sprite.y -= ny * overlap / 2;

    a.velocityX += nx * SHIP.KNOCKBACK_FORCE;
    a.velocityY += ny * SHIP.KNOCKBACK_FORCE;
    b.velocityX -= nx * SHIP.KNOCKBACK_FORCE;
    b.velocityY -= ny * SHIP.KNOCKBACK_FORCE;

    return true;
  }
}
