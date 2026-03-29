import Phaser from 'phaser';
import { Ship } from '../entities/Ship';
import { WeaponSystem } from '../systems/WeaponSystem';
import { PhysicsSystem } from '../systems/PhysicsSystem';

export interface AIBehavior {
  update(
    ship: Ship,
    target: Ship,
    delta: number,
    scene: Phaser.Scene,
    weapons: WeaponSystem,
    physics: PhysicsSystem,
  ): void;
}
