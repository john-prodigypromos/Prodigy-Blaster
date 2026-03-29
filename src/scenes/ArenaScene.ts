import Phaser from 'phaser';
import { Ship, ShipConfig } from '../entities/Ship';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { WeaponSystem } from '../systems/WeaponSystem';
import { DamageSystem } from '../systems/DamageSystem';
import { HUDSystem } from '../systems/HUDSystem';
import { RustyBehavior } from '../ai/behaviors/RustyBehavior';
import { AIBehavior } from '../ai/AIBehavior';
import { GAME_WIDTH, GAME_HEIGHT, SHIP, AI, COLORS } from '../config';
import { createStarfieldTexture } from '../ui/Starfield';

export class ArenaScene extends Phaser.Scene {
  private player!: Ship;
  private enemy!: Ship;
  private physicsSystem!: PhysicsSystem;
  private weapons!: WeaponSystem;
  private damageSystem!: DamageSystem;
  private hud!: HUDSystem;
  private aiBehavior!: AIBehavior;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private wasd!: { w: Phaser.Input.Keyboard.Key; a: Phaser.Input.Keyboard.Key; s: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key };

  private score = 0;
  private matchOver = false;

  constructor() {
    super({ key: 'Arena' });
  }

  create(): void {
    createStarfieldTexture(this, 'starfield');
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'starfield');

    this.cameras.main.setBackgroundColor(COLORS.arena);

    // Border
    const border = this.add.graphics();
    border.lineStyle(1, COLORS.wall, 0.15);
    border.strokeRect(2, 2, GAME_WIDTH - 4, GAME_HEIGHT - 4);

    // Systems
    this.physicsSystem = new PhysicsSystem();
    this.weapons = new WeaponSystem();
    this.damageSystem = new DamageSystem();

    // Player
    const playerConfig: ShipConfig = {
      hull: SHIP.PLAYER_HULL,
      shield: SHIP.PLAYER_SHIELD,
      speedMult: 1,
      rotationMult: 1,
      textureKey: 'ship_player',
      hitboxRadius: SHIP.HITBOX_RADIUS,
    };
    this.player = new Ship(this, GAME_WIDTH * 0.3, GAME_HEIGHT * 0.7, playerConfig);
    this.player.rotation = -Math.PI / 2;

    // Enemy (Rusty)
    const enemyConfig: ShipConfig = {
      hull: AI.RUSTY_HULL,
      shield: AI.RUSTY_SHIELD,
      speedMult: AI.RUSTY_SPEED_MULT,
      rotationMult: AI.RUSTY_ROTATION_MULT,
      textureKey: 'ship_enemy',
      hitboxRadius: SHIP.HITBOX_RADIUS,
    };
    this.enemy = new Ship(this, GAME_WIDTH * 0.7, GAME_HEIGHT * 0.3, enemyConfig);
    this.enemy.rotation = Math.PI / 2;

    // AI
    this.aiBehavior = new RustyBehavior();

    // HUD
    this.hud = new HUDSystem(this);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.wasd = {
      w: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.score = 0;
    this.matchOver = false;
  }

  update(_time: number, delta: number): void {
    if (this.matchOver) return;

    const now = Date.now();
    const ships = [this.player, this.enemy];

    // Player input
    if (this.cursors.left.isDown || this.wasd.a.isDown) {
      this.physicsSystem.applyRotation(this.player, -1);
    }
    if (this.cursors.right.isDown || this.wasd.d.isDown) {
      this.physicsSystem.applyRotation(this.player, 1);
    }
    if (this.cursors.up.isDown || this.wasd.w.isDown) {
      this.physicsSystem.applyThrust(this.player, 1);
    }
    if (this.fireKey.isDown) {
      this.weapons.fireBlaster(this, this.player, 'player');
    }

    // AI
    this.aiBehavior.update(this.enemy, this.player, delta, this, this.weapons, this.physicsSystem);

    // Physics
    this.physicsSystem.update(delta, ships);

    // Bolt lifecycle
    this.weapons.update();

    // Damage: bolts vs ships
    const bolts = this.weapons.getBolts();

    const enemyHits = this.damageSystem.checkBoltHits(bolts, this.enemy, 'enemy');
    for (const bolt of enemyHits) {
      this.damageSystem.applyBoltDamage(this.enemy, bolt, now);
      this.score += 10;
      bolt.destroy();
    }

    const playerHits = this.damageSystem.checkBoltHits(bolts, this.player, 'player');
    for (const bolt of playerHits) {
      this.damageSystem.applyBoltDamage(this.player, bolt, now);
      bolt.destroy();
    }

    // Ship collision
    this.damageSystem.checkShipCollision(this.player, this.enemy, now);

    // Shield regen
    this.player.updateShieldRegen(now);
    this.enemy.updateShieldRegen(now);

    // I-frame flicker
    this.player.sprite.setAlpha(this.player.isInvincible ? (Math.sin(now * 0.02) > 0 ? 1 : 0.3) : 1);
    this.enemy.sprite.setAlpha(this.enemy.isInvincible ? (Math.sin(now * 0.02) > 0 ? 1 : 0.3) : 1);

    // Win/Lose
    if (!this.enemy.alive) {
      this.endMatch('win');
    } else if (!this.player.alive) {
      this.endMatch('lose');
    }

    // HUD
    this.hud.update(this.player, this.enemy, this.score);
  }

  private endMatch(result: 'win' | 'lose'): void {
    this.matchOver = true;

    const msg = result === 'win'
      ? 'OPPONENT DESTROYED\nPress ENTER to continue'
      : 'SHIP DESTROYED\nPress ENTER to retry';

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, msg, {
      fontSize: '28px',
      fontFamily: '"Courier New", monospace',
      color: result === 'win' ? '#44ccaa' : '#ff6644',
      align: 'center',
    }).setOrigin(0.5).setDepth(200);

    this.input.keyboard!.once('keydown-ENTER', () => {
      this.weapons.clear();
      this.hud.destroy();
      this.scene.restart();
    });
  }
}
