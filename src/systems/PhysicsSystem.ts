import { Ship } from '../entities/Ship';
import { PHYSICS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { dragPerStep } from '../utils/math';

export interface InputState {
  rotateDir: number;   // -1, 0, or 1
  thrust: number;      // 0 or 1
}

export class PhysicsSystem {
  private accumulator = 0;
  private readonly dt = PHYSICS.FIXED_TIMESTEP / 1000;

  /** Per-ship input that gets consumed inside the fixed timestep */
  private inputMap = new Map<Ship, InputState>();

  setInput(ship: Ship, input: InputState): void {
    this.inputMap.set(ship, input);
  }

  update(delta: number, ships: Ship[], gameTime: number): { wallHits: Ship[] } {
    this.accumulator += delta;
    const wallHits: Ship[] = [];

    while (this.accumulator >= PHYSICS.FIXED_TIMESTEP) {
      this.accumulator -= PHYSICS.FIXED_TIMESTEP;

      for (const ship of ships) {
        if (!ship.alive) continue;

        // Apply input inside the fixed step
        const input = this.inputMap.get(ship);
        if (input) {
          if (input.rotateDir !== 0) {
            const rotSpeed = PHYSICS.ROTATION_SPEED * ship.rotationMult;
            ship.rotation += rotSpeed * input.rotateDir * this.dt;
          }
          if (input.thrust > 0) {
            const thrustForce = PHYSICS.THRUST * ship.speedMult * input.thrust;
            ship.velocityX += Math.cos(ship.rotation) * thrustForce * this.dt;
            ship.velocityY += Math.sin(ship.rotation) * thrustForce * this.dt;
          }
        }

        const hitWall = this.stepShip(ship);
        if (hitWall) {
          wallHits.push(ship);
        }
      }
    }

    return { wallHits };
  }

  /** Returns true if the ship hit a wall */
  private stepShip(ship: Ship): boolean {
    const drag = dragPerStep(PHYSICS.DRAG_HALF_LIFE, this.dt);
    ship.velocityX *= drag;
    ship.velocityY *= drag;

    const speed = Math.sqrt(ship.velocityX ** 2 + ship.velocityY ** 2);
    const maxSpeed = PHYSICS.MAX_VELOCITY * ship.speedMult;
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      ship.velocityX *= scale;
      ship.velocityY *= scale;
    }

    const newX = ship.sprite.x + ship.velocityX * this.dt;
    const newY = ship.sprite.y + ship.velocityY * this.dt;

    const r = ship.sprite.width / 2;
    let finalX = newX;
    let finalY = newY;
    let hitWall = false;

    if (newX - r < 0) {
      finalX = r;
      ship.velocityX = Math.abs(ship.velocityX) * PHYSICS.WALL_BOUNCE_FACTOR;
      hitWall = true;
    } else if (newX + r > GAME_WIDTH) {
      finalX = GAME_WIDTH - r;
      ship.velocityX = -Math.abs(ship.velocityX) * PHYSICS.WALL_BOUNCE_FACTOR;
      hitWall = true;
    }

    if (newY - r < 0) {
      finalY = r;
      ship.velocityY = Math.abs(ship.velocityY) * PHYSICS.WALL_BOUNCE_FACTOR;
      hitWall = true;
    } else if (newY + r > GAME_HEIGHT) {
      finalY = GAME_HEIGHT - r;
      ship.velocityY = -Math.abs(ship.velocityY) * PHYSICS.WALL_BOUNCE_FACTOR;
      hitWall = true;
    }

    ship.sprite.setPosition(finalX, finalY);
    ship.updateSpriteFrame();

    return hitWall;
  }
}
