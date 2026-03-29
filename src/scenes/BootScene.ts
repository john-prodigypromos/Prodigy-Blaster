import Phaser from 'phaser';
import { COLORS } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create(): void {
    // Player ship placeholder — triangle pointing up
    this.generateTriangle('ship_player', 40, 50, COLORS.player);
    // Enemy ship placeholder
    this.generateTriangle('ship_enemy', 36, 44, COLORS.enemy);
    // Bolts
    this.generateRect('bolt_player', 3, 14, COLORS.playerBolt);
    this.generateRect('bolt_enemy', 3, 14, COLORS.enemyBolt);

    this.scene.start('Arena');
  }

  private generateTriangle(key: string, w: number, h: number, color: number): void {
    const gfx = this.make.graphics({}, false);
    gfx.fillStyle(color, 1);
    gfx.fillTriangle(w / 2, 0, 0, h, w, h);
    gfx.lineStyle(1, 0xffffff, 0.15);
    gfx.strokeTriangle(w / 2, 0, 0, h, w, h);
    gfx.generateTexture(key, w, h);
    gfx.destroy();
  }

  private generateRect(key: string, w: number, h: number, color: number): void {
    const gfx = this.make.graphics({}, false);
    gfx.fillStyle(color, 1);
    gfx.fillRect(0, 0, w, h);
    gfx.generateTexture(key, w, h);
    gfx.destroy();
  }
}
