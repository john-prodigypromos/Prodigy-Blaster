import Phaser from 'phaser';
import { COLORS } from '../config';
import { generateShipSpriteSheet } from '../ships/ShipSpriteGenerator';
import { drawPlayerShip, PLAYER_FRAME_SIZE } from '../ships/PlayerShipRenderer';
import { drawEnemyShip, ENEMY_FRAME_SIZE } from '../ships/EnemyShipRenderer';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create(): void {
    // HD canvas-rendered ship sprite sheets (72 rotation frames each)
    generateShipSpriteSheet(this, 'ship_player', drawPlayerShip, PLAYER_FRAME_SIZE, 42);
    generateShipSpriteSheet(this, 'ship_enemy', drawEnemyShip, ENEMY_FRAME_SIZE, 137);

    // Bolts (keep simple rects)
    this.generateRect('bolt_player', 3, 14, COLORS.playerBolt);
    this.generateRect('bolt_enemy', 3, 14, COLORS.enemyBolt);

    this.scene.start('Arena');
  }

  private generateRect(key: string, w: number, h: number, color: number): void {
    const gfx = this.make.graphics({}, false);
    gfx.fillStyle(color, 1);
    gfx.fillRect(0, 0, w, h);
    gfx.generateTexture(key, w, h);
    gfx.destroy();
  }
}
