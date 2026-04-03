import Phaser from 'phaser';
import { Ship, ShipConfig } from '../entities/Ship';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { WeaponSystem } from '../systems/WeaponSystem';
import { DamageSystem } from '../systems/DamageSystem';
import { HUDSystem } from '../systems/HUDSystem';
import { RustyBehavior } from '../ai/behaviors/RustyBehavior';
import { AIBehavior } from '../ai/AIBehavior';
import { SHIP, PHYSICS, COLORS, getGameSize } from '../config';
import { currentDifficulty, DIFFICULTY } from '../state/Difficulty';
import { currentCharacter, CHARACTERS } from '../state/Character';
import { getCurrentLevel, carryOverHull, carryOverShield, advanceLevel, isLastLevel, totalScore, resetLevelState } from '../state/LevelState';
import { createStarfieldTexture } from '../ui/Starfield';
import { TouchControls } from '../ui/TouchControls';
import { SoundSystem } from '../systems/SoundSystem';

export class ArenaScene extends Phaser.Scene {
  private player!: Ship;
  private enemies: Ship[] = [];
  private aiBehaviors: AIBehavior[] = [];
  private physicsSystem!: PhysicsSystem;
  private weapons!: WeaponSystem;
  private damageSystem!: DamageSystem;
  private hud!: HUDSystem;
  private touchControls!: TouchControls;
  private sound_sys!: SoundSystem;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private wasd!: { w: Phaser.Input.Keyboard.Key; a: Phaser.Input.Keyboard.Key; s: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key };

  private score = 0;
  private matchStartTime = 0;
  private matchOver = false;
  private explodedEnemies = new Set<Ship>();

  constructor() {
    super({ key: 'Arena' });
  }

  create(): void {
    const { w, h } = getGameSize(this);
    const level = getCurrentLevel();
    const diff = DIFFICULTY[currentDifficulty];

    // Reset per-match state
    this.enemies = [];
    this.aiBehaviors = [];
    this.explodedEnemies = new Set();
    this.score = totalScore; // carry cumulative score
    this.matchStartTime = this.time.now;
    this.matchOver = false;

    createStarfieldTexture(this, 'starfield');
    this.add.image(w / 2, h / 2, 'starfield');

    this.cameras.main.setBackgroundColor(COLORS.arena);

    const border = this.add.graphics();
    border.lineStyle(1, COLORS.wall, 0.15);
    border.strokeRect(2, 2, w - 4, h - 4);

    // Systems
    this.physicsSystem = new PhysicsSystem();
    this.weapons = new WeaponSystem();
    this.damageSystem = new DamageSystem();

    // Player — use carry-over health if available
    const playerConfig: ShipConfig = {
      hull: diff.playerHull,
      shield: diff.playerShield,
      speedMult: 1,
      rotationMult: 1,
      textureKey: 'ship_player',
      hitboxRadius: SHIP.HITBOX_RADIUS,
    };
    this.player = new Ship(this, w * 0.3, h * 0.7, playerConfig);
    this.player.rotation = -Math.PI / 2;

    // Apply carry-over from previous level
    if (carryOverHull !== null) {
      this.player.hull = carryOverHull;
    }
    if (carryOverShield !== null) {
      this.player.shield = carryOverShield;
    }

    // Player smoke emitter
    this.player.smokeEmitter = this.add.particles(0, 0, 'particle_smoke', {
      speed: { min: 10, max: 40 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: { min: 300, max: 800 },
      tint: [0xff6600, 0x444444, 0x222222],
      emitting: false,
    });
    this.player.smokeEmitter.setDepth(45);

    // Spawn enemies based on level config
    const enemySpawnPoints = [
      { x: w * 0.7, y: h * 0.3 },
      { x: w * 0.3, y: h * 0.2 },
      { x: w * 0.8, y: h * 0.6 },
    ];

    for (let i = 0; i < level.enemyCount; i++) {
      const spawn = enemySpawnPoints[i];
      const enemyConfig: ShipConfig = {
        hull: diff.enemyHull,
        shield: diff.enemyShield,
        speedMult: diff.enemySpeedMult * level.enemySpeedBonus,
        rotationMult: diff.enemyRotationMult * level.enemyRotationBonus,
        textureKey: 'ship_enemy',
        hitboxRadius: SHIP.HITBOX_RADIUS,
      };
      const enemy = new Ship(this, spawn.x, spawn.y, enemyConfig);
      enemy.rotation = Math.PI / 2;

      // Smoke emitter per enemy
      enemy.smokeEmitter = this.add.particles(0, 0, 'particle_smoke', {
        speed: { min: 10, max: 40 },
        scale: { start: 0.6, end: 0 },
        alpha: { start: 0.5, end: 0 },
        lifespan: { min: 300, max: 800 },
        tint: [0xff6600, 0x444444, 0x222222],
        emitting: false,
      });
      enemy.smokeEmitter.setDepth(45);

      this.enemies.push(enemy);
      this.aiBehaviors.push(new RustyBehavior());
    }

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

    // Touch controls (auto-detected)
    this.touchControls = new TouchControls(this);

    // Sound system — try to start music immediately, retry on user gesture if needed
    this.sound_sys = new SoundSystem();
    this.sound_sys.init();
    this.sound_sys.startMusic();

    // Persistent retry on interaction until music is playing (AudioContext may be suspended)
    let musicRetried = false;
    const retryMusic = () => {
      if (musicRetried) return;
      this.sound_sys.init();
      if (!this.sound_sys.isMusicPlaying()) {
        this.sound_sys.startMusic();
      }
      if (this.sound_sys.isMusicPlaying()) {
        musicRetried = true;
      }
    };
    this.input.on('pointerdown', retryMusic);
    this.input.keyboard!.on('keydown', retryMusic);
  }

  update(_time: number, delta: number): void {
    if (this.matchOver) return;

    const now = this.time.now;
    const allShips = [this.player, ...this.enemies];

    // Merge keyboard + touch input
    const touch = this.touchControls.getInput();
    let rotateDir = 0;
    let thrust = 0;
    let fire = false;

    // Keyboard
    if (this.cursors.left.isDown || this.wasd.a.isDown) rotateDir = -1;
    if (this.cursors.right.isDown || this.wasd.d.isDown) rotateDir = 1;
    if (this.cursors.up.isDown || this.wasd.w.isDown) thrust = 1;
    if (this.cursors.down.isDown || this.wasd.s.isDown) thrust = -1;
    if (this.fireKey.isDown) fire = true;

    // Touch (merge — touch overrides if active)
    if (touch.rotateDir !== 0) rotateDir = touch.rotateDir;
    if (touch.thrust !== 0) thrust = touch.thrust;
    if (touch.fire) fire = true;

    this.physicsSystem.setInput(this.player, { rotateDir, thrust });

    if (fire) {
      const fired = this.weapons.fireBlaster(this, this.player, 'player', now);
      if (fired) this.sound_sys.playerShoot();
    }

    // Engine thrust sound
    if (thrust > 0) {
      this.sound_sys.startThrust();
    } else {
      this.sound_sys.stopThrust();
      this.sound_sys.stopMusic();
    }

    // Draw touch controls overlay
    this.touchControls.draw();

    // AI for each enemy
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (!enemy.alive) continue;
      const boltsBefore = this.weapons.getBolts().length;
      this.aiBehaviors[i].update(enemy, this.player, delta, this, this.weapons, this.physicsSystem, now);
      if (this.weapons.getBolts().length > boltsBefore) {
        this.sound_sys.enemyShoot();
      }
    }

    // Physics (returns wall hits for damage)
    const { wallHits } = this.physicsSystem.update(delta, allShips, now);
    for (const ship of wallHits) {
      if (!ship.isInvincible(now)) {
        ship.applyDamage(PHYSICS.WALL_DAMAGE, false, now);
        this.sound_sys.wallBounce();
      }
    }

    // Bolt lifecycle
    this.weapons.update(now, delta);

    // Damage: bolts vs each enemy
    const bolts = this.weapons.getBolts();
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const enemyHits = this.damageSystem.checkBoltHits(bolts, enemy, 'enemy', now);
      for (const bolt of enemyHits) {
        const hadShield = enemy.shield > 0;
        this.damageSystem.applyBoltDamage(enemy, bolt, now);
        const hullDamage = hadShield && enemy.shield >= 0 ? 0 : bolt.damage;
        this.score += hullDamage > 0 ? 10 : 0;
        hadShield && enemy.shield > 0 ? this.sound_sys.shieldHit() : this.sound_sys.hullHit();
        bolt.destroy();
      }
    }

    // Damage: bolts vs player
    const playerHits = this.damageSystem.checkBoltHits(bolts, this.player, 'player', now);
    for (const bolt of playerHits) {
      const hadShield = this.player.shield > 0;
      this.damageSystem.applyBoltDamage(this.player, bolt, now);
      hadShield && this.player.shield > 0 ? this.sound_sys.shieldHit() : this.sound_sys.hullHit();
      bolt.destroy();
    }

    // Ship collisions (all pairs)
    if (this.damageSystem.checkAllShipCollisions(this.player, this.enemies, now)) {
      this.sound_sys.shipCollision();
    }

    // Shield regen + damage visuals for all ships
    this.player.updateShieldRegen(now);
    this.player.updateDamageVisuals(now);
    this.player.sprite.setAlpha(this.player.isInvincible(now) ? (Math.sin(now * 0.02) > 0 ? 1 : 0.3) : 1);

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.updateShieldRegen(now);
      enemy.updateDamageVisuals(now);
      enemy.sprite.setAlpha(enemy.isInvincible(now) ? (Math.sin(now * 0.02) > 0 ? 1 : 0.3) : 1);
    }

    // Per-enemy explosions — trigger when each enemy dies
    for (const enemy of this.enemies) {
      if (!enemy.alive && !this.explodedEnemies.has(enemy)) {
        this.explodedEnemies.add(enemy);
        this.spawnExplosion(enemy.sprite.x, enemy.sprite.y);
        this.sound_sys.explosion();
        this.score += 500;
        // Hide dead enemy sprite
        enemy.sprite.setVisible(false);
        if (enemy.smokeEmitter) enemy.smokeEmitter.stop();
      }
    }

    // Win: all enemies dead
    if (this.enemies.every(e => !e.alive)) {
      this.sound_sys.stopThrust();
      this.sound_sys.stopMusic();
      this.endMatch('win', now);
    }
    // Lose: player dead
    else if (!this.player.alive) {
      this.spawnExplosion(this.player.sprite.x, this.player.sprite.y);
      this.sound_sys.explosion();
      this.sound_sys.stopThrust();
      this.sound_sys.stopMusic();
      this.endMatch('lose', now);
    }

    // HUD
    const level = getCurrentLevel();
    this.hud.update(this.player, this.enemies, this.score, level.level);
  }

  private spawnExplosion(x: number, y: number): void {
    const emitter = this.add.particles(x, y, 'particle_explosion', {
      speed: { min: 80, max: 350 },
      scale: { start: 1.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 400, max: 1200 },
      quantity: 60,
      tint: [0xff3300, 0xff8800, 0xffcc00, 0xffffff],
      emitting: false,
    });
    emitter.setDepth(150);
    emitter.explode();

    // Screen shake for impact
    this.cameras.main.shake(400, 0.02);

    // Clean up after particles finish
    this.time.delayedCall(1500, () => emitter.destroy());
  }

  private endMatch(result: 'win' | 'lose', now: number): void {
    this.matchOver = true;

    const { w, h } = getGameSize(this);

    if (result === 'win' && !isLastLevel()) {
      // ── Level complete — advance to next level ──
      const elapsedSec = Math.floor((now - this.matchStartTime) / 1000);
      const timeBonus = Math.max(0, 5000 - elapsedSec * 50);
      this.score += timeBonus + 1000;

      // Store carry-over and advance
      advanceLevel(this.player.hull, this.player.maxHull, this.player.maxShield, this.score - totalScore);

      this.time.delayedCall(600, () => {
        this.sound_sys.levelComplete();
      });

      // Brief "LEVEL COMPLETE" overlay
      const bannerBg = this.add.graphics();
      bannerBg.setDepth(199);
      bannerBg.fillStyle(0x000000, 0.7);
      bannerBg.fillRect(0, h / 2 - 50, w, 100);

      const completeText = this.add.text(w / 2, h / 2, 'LEVEL COMPLETE!', {
        fontSize: '36px',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        color: '#00ff66',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5, 0.5).setDepth(200).setAlpha(0);

      this.tweens.add({
        targets: completeText,
        alpha: 1,
        duration: 400,
        ease: 'Power2',
      });

      // Transition to next level intro after 1.5s
      this.time.delayedCall(1500, () => {
        this.weapons.clear();
        this.hud.destroy();
        this.touchControls.destroy();
        this.sound_sys.stopThrust();
      this.sound_sys.stopMusic();
        this.scene.start('LevelIntro');
      });

      return;
    }

    // ── Final win or lose — full overlay ──

    // Victory/defeat jingle
    this.time.delayedCall(600, () => {
      result === 'win' ? this.sound_sys.victory() : this.sound_sys.defeat();
    });

    // Scoring bonuses on final win
    if (result === 'win') {
      const elapsedSec = Math.floor((now - this.matchStartTime) / 1000);
      const timeBonus = Math.max(0, 5000 - elapsedSec * 50);
      const winBonus = 1000;
      this.score += timeBonus + winBonus;
    }

    const bannerBg = this.add.graphics();
    bannerBg.setDepth(199);

    if (result === 'lose') {
      bannerBg.fillStyle(0x000000, 0.8);
      bannerBg.fillRect(0, 0, w, h);

      const kipFace = this.add.image(w / 2, h / 2 - 60, 'villain_kip');
      const kipScale = 280 / Math.max(kipFace.width, kipFace.height);
      kipFace.setScale(kipScale);
      kipFace.setDepth(200);
      kipFace.setAlpha(0);

      const kipBorder = this.add.graphics();
      kipBorder.setDepth(199);
      kipBorder.lineStyle(3, 0xff2200, 0.8);
      kipBorder.strokeRect(w / 2 - 145, h / 2 - 60 - 145, 290, 290);

      this.tweens.add({
        targets: kipFace,
        alpha: 1,
        scale: kipScale * 1.05,
        duration: 800,
        ease: 'Power2',
      });

      this.time.delayedCall(400, () => {
        this.sound_sys.evilLaugh();
      });
    } else {
      bannerBg.fillStyle(0x000000, 0.8);
      bannerBg.fillRect(0, 0, w, h);

      const charCfg = CHARACTERS[currentCharacter];
      const heroFace = this.add.image(w / 2, h / 2 - 100, charCfg.imageKey);
      const heroScale = 240 / Math.max(heroFace.width, heroFace.height);
      heroFace.setScale(heroScale);
      heroFace.setDepth(200);
      heroFace.setAlpha(0);

      const heroBorder = this.add.graphics();
      heroBorder.setDepth(199);
      heroBorder.lineStyle(4, charCfg.color, 1);
      heroBorder.strokeRect(w / 2 - 125, h / 2 - 100 - 125, 250, 250);

      // Fade in, then joyful bounce
      this.tweens.add({
        targets: heroFace,
        alpha: 1,
        scale: heroScale * 1.05,
        duration: 600,
        ease: 'Power2',
        onComplete: () => {
          // Bounce loop — excited wobble
          this.tweens.add({
            targets: heroFace,
            scaleX: heroScale * 1.15,
            scaleY: heroScale * 0.95,
            y: h / 2 - 108,
            duration: 200,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: 3,
          });
        },
      });

      // Big "YAY!" text pops in
      const yayText = this.add.text(w / 2, h / 2 - 100 - 145, 'YAY!', {
        fontSize: '48px',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        color: '#ffff00',
        stroke: '#000000',
        strokeThickness: 5,
      }).setOrigin(0.5, 0.5).setDepth(202).setScale(0).setAlpha(0);

      this.time.delayedCall(700, () => {
        this.tweens.add({
          targets: yayText,
          scale: 1,
          alpha: 1,
          duration: 300,
          ease: 'Back.easeOut',
        });
        // Slight rotation wobble on the YAY text
        this.tweens.add({
          targets: yayText,
          angle: { from: -8, to: 8 },
          duration: 150,
          yoyo: true,
          repeat: 2,
          delay: 300,
        });
        this.sound_sys.yay();
      });
    }

    if (result === 'win') {
      // Win: show headline briefly, then go to high score entry
      const textY = h / 2 + 100;
      this.add.text(w / 2, textY, 'YOU WON!\nHUMANITY HAS BEEN SAVED!', {
        fontSize: '28px',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        color: '#00ff66',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5, 0.5).setDepth(200);

      this.add.text(w / 2, textY + 40, `SCORE: ${this.score.toLocaleString()}`, {
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        color: '#ffff00',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5, 0.5).setDepth(200);

      // After celebration, transition to high score entry
      const level = getCurrentLevel();
      this.time.delayedCall(2500, () => {
        this.weapons.clear();
        this.hud.destroy();
        this.touchControls.destroy();
        this.sound_sys.stopThrust();
        this.sound_sys.stopMusic();
        resetLevelState();
        this.scene.start('HighScore', {
          score: this.score,
          level: level.level,
          difficulty: currentDifficulty,
        });
      });
    } else {
      // Lose: show headline + press ENTER
      const textY = h / 2 + 130;
      this.add.text(w / 2, textY, 'YOU LOST!\nTRY AGAIN LOSER!', {
        fontSize: '28px',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        color: '#ff4444',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5, 0.5).setDepth(200);

      this.add.text(w / 2, textY + 50, 'Press ENTER for menu', {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        align: 'center',
      }).setOrigin(0.5, 0.5).setDepth(200);

      const goToTitle = () => {
        this.weapons.clear();
        this.hud.destroy();
        this.touchControls.destroy();
        this.sound_sys.stopThrust();
        this.sound_sys.stopMusic();
        resetLevelState();
        this.scene.start('Title');
      };
      this.input.keyboard!.once('keydown-ENTER', goToTitle);
      this.input.once('pointerdown', goToTitle);
    }
  }
}
