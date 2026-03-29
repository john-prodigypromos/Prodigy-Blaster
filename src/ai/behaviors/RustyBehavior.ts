import Phaser from 'phaser';
import { AIBehavior } from '../AIBehavior';
import { Ship } from '../../entities/Ship';
import { WeaponSystem } from '../../systems/WeaponSystem';
import { PhysicsSystem } from '../../systems/PhysicsSystem';
import { AI } from '../../config';
import { angleDiff } from '../../utils/math';

export class RustyBehavior implements AIBehavior {
  update(
    ship: Ship,
    target: Ship,
    _delta: number,
    scene: Phaser.Scene,
    weapons: WeaponSystem,
    physics: PhysicsSystem,
  ): void {
    if (!ship.alive || !target.alive) return;

    const dx = target.sprite.x - ship.sprite.x;
    const dy = target.sprite.y - ship.sprite.y;
    const angleToTarget = Math.atan2(dy, dx);
    const dist = Math.sqrt(dx * dx + dy * dy);

    const diff = angleDiff(ship.rotation, angleToTarget);
    if (Math.abs(diff) > 0.05) {
      physics.applyRotation(ship, Math.sign(diff));
    }

    if (Math.abs(diff) < 0.5 && dist > 100) {
      physics.applyThrust(ship, 1);
    }

    if (Math.abs(diff) < 0.3 && dist < AI.RUSTY_CHASE_RANGE) {
      const now = Date.now();
      if (now - ship.lastFireTime >= AI.RUSTY_FIRE_RATE) {
        ship.lastFireTime = now;
        weapons.fireBlaster(scene, ship, 'enemy');
      }
    }
  }
}
