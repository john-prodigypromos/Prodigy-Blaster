import Phaser from 'phaser';
import { SHIP } from '../config';
import { rotationToFrame } from '../ships/ShipSpriteGenerator';

export interface ShipConfig {
  hull: number;
  shield: number;
  speedMult: number;
  rotationMult: number;
  textureKey: string;
  hitboxRadius: number;
}

export class Ship {
  sprite: Phaser.Physics.Arcade.Sprite;
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  speedMult: number;
  rotationMult: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  iframesUntil: number;
  lastDamageTime: number;
  alive: boolean;
  lastFireTime: number;

  constructor(scene: Phaser.Scene, x: number, y: number, config: ShipConfig) {
    this.sprite = scene.physics.add.sprite(x, y, config.textureKey, 0);
    this.sprite.setCircle(config.hitboxRadius);
    this.sprite.setOffset(
      this.sprite.width / 2 - config.hitboxRadius,
      this.sprite.height / 2 - config.hitboxRadius,
    );

    this.hull = config.hull;
    this.maxHull = config.hull;
    this.shield = config.shield;
    this.maxShield = config.shield;
    this.speedMult = config.speedMult;
    this.rotationMult = config.rotationMult;
    this.rotation = -Math.PI / 2;
    this.velocityX = 0;
    this.velocityY = 0;
    this.iframesUntil = 0;
    this.lastDamageTime = 0;
    this.alive = true;
    this.lastFireTime = 0;
  }

  /**
   * Update the sprite frame to match the current rotation angle.
   * Call this instead of sprite.setRotation().
   */
  updateSpriteFrame(): void {
    const frame = rotationToFrame(this.rotation);
    this.sprite.setFrame(frame);
  }

  /** Check invincibility — pass current game time (ms) */
  isInvincible(time: number): boolean {
    return time < this.iframesUntil;
  }

  applyDamage(amount: number, pierceShield: boolean, time: number): number {
    if (!this.alive) return 0;

    let remaining = amount;

    if (!pierceShield && this.shield > 0) {
      const shieldAbsorb = Math.min(this.shield, remaining);
      this.shield -= shieldAbsorb;
      remaining -= shieldAbsorb;
    }

    if (remaining > 0) {
      this.hull = Math.max(0, this.hull - remaining);
    }

    this.lastDamageTime = time;

    if (this.hull <= 0) {
      this.alive = false;
    }

    return remaining;
  }

  updateShieldRegen(time: number): void {
    if (this.shield >= this.maxShield) return;
    if (this.maxShield === 0) return;
    if (time - this.lastDamageTime < SHIP.SHIELD_REGEN_DELAY) return;

    this.shield = Math.min(
      this.maxShield,
      this.shield + SHIP.SHIELD_REGEN_RATE / 60,
    );
  }
}
