// ── Rusty AI Behavior (3D) ───────────────────────────────
// Enemy roams around the arena, periodically swooping in to
// attack the player then pulling away to a new position.
// Player has to look around to find them.

import * as THREE from 'three';
import { Ship3D } from '../../entities/Ship3D';
import { AI } from '../../config';
import type { AIBehavior3D } from '../AIBehavior3D';
import type { ShipInput } from '../../systems/PhysicsSystem3D';

let enemyIndex = 0;

type Phase = 'roam' | 'approach' | 'attack' | 'retreat';

export class RustyBehavior3D implements AIBehavior3D {
  private fireRate: number;
  private timer = 0;
  private phase: Phase = 'approach'; // start heading straight at the player
  private phaseTimer = 0;
  private idx: number;
  private roamTarget = new THREE.Vector3();

  constructor(
    _aimAccuracy: number = AI.RUSTY_AIM_ACCURACY,
    fireRate: number = AI.RUSTY_FIRE_RATE,
    _chaseRange: number = AI.RUSTY_CHASE_RANGE,
  ) {
    this.fireRate = fireRate;
    this.idx = enemyIndex++;
    this.timer = this.idx * 3;
    this.pickNewRoamTarget();
  }

  private pickNewRoamTarget(): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 40;
    const y = (Math.random() - 0.5) * 20;
    this.roamTarget.set(Math.cos(angle) * dist, y, Math.sin(angle) * dist);
  }

  update(self: Ship3D, target: Ship3D, dt: number, now: number): ShipInput & { fire: boolean } {
    if (!self.alive || !target.alive) {
      return { yaw: 0, pitch: 0, roll: 0, thrust: 0, fire: false };
    }

    this.timer += dt;
    this.phaseTimer += dt;

    const distToPlayer = self.position.distanceTo(target.position);

    // Phase transitions — aggressive: short roam, fast approach, long attack runs
    if (this.phase === 'roam' && this.phaseTimer > 1.5 + this.idx * 0.5) {
      this.phase = 'approach';
      this.phaseTimer = 0;
    } else if (this.phase === 'approach' && (distToPlayer < 35 || this.phaseTimer > 3)) {
      this.phase = 'attack';
      this.phaseTimer = 0;
    } else if (this.phase === 'attack' && this.phaseTimer > 5) {
      // Longer attack runs before retreating
      this.phase = 'retreat';
      this.phaseTimer = 0;
      this.pickNewRoamTarget();
    } else if (this.phase === 'retreat' && (distToPlayer > 60 || this.phaseTimer > 1.5)) {
      // Short retreat, then immediately back to hunting
      this.phase = 'approach'; // skip roam — go straight back to approaching
      this.phaseTimer = 0;
    }

    let desiredPos = new THREE.Vector3();

    switch (this.phase) {
      case 'roam':
        // Drift toward a random point in the arena
        desiredPos.copy(this.roamTarget);
        // Pick new target if close
        if (self.position.distanceTo(this.roamTarget) < 10) {
          this.pickNewRoamTarget();
        }
        break;

      case 'approach': {
        // Head-on approach with aggressive evasive weaving — hard to hit
        desiredPos.copy(target.position);

        // Weave laterally and vertically while closing distance
        const weaveSpeed = 2.0 + this.idx * 0.5;
        const weaveAmplitude = 30 + this.idx * 10; // wider weave per enemy
        const lateralWeave = Math.sin(this.timer * weaveSpeed + this.idx * 2.1) * weaveAmplitude;
        const verticalWeave = Math.cos(this.timer * weaveSpeed * 0.7 + this.idx * 1.3) * weaveAmplitude * 0.6;

        // Perpendicular to the line between enemy and player
        const toPlayer = target.position.clone().sub(self.position).normalize();
        const right = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);

        desiredPos.addScaledVector(right, lateralWeave);
        desiredPos.y += verticalWeave;
        break;
      }

      case 'attack': {
        // Maneuver to the player's BLIND SPOTS — behind, above, or below.
        // Get the player's forward direction and position behind them.
        const playerFwd = target.getForward();

        // Primary attack vector: get behind the player
        const behindOffset = playerFwd.clone().multiplyScalar(-25); // 25 units behind

        // Add weaving motion so enemies aren't in a static line
        const weaveAngle = this.timer * 1.2 + this.idx * Math.PI * 0.7;
        const weaveRight = new THREE.Vector3(-playerFwd.z, 0, playerFwd.x); // perpendicular to forward
        const weaveAmount = Math.sin(weaveAngle) * 12;

        // Some enemies attack from above/below instead of directly behind
        const verticalBias = Math.cos(this.idx * 1.7 + this.timer * 0.5) * 12;

        desiredPos.set(
          target.position.x + behindOffset.x + weaveRight.x * weaveAmount,
          target.position.y + verticalBias,
          target.position.z + behindOffset.z + weaveRight.z * weaveAmount,
        );
        break;
      }

      case 'retreat':
        // Pull away to roam target
        desiredPos.copy(this.roamTarget);
        break;
    }

    // Move toward desired position — faster lerp for snappier movement
    const lerpRate = Math.min(1, dt * 3.5);
    self.position.x += (desiredPos.x - self.position.x) * lerpRate;
    self.position.y += (desiredPos.y - self.position.y) * lerpRate;
    self.position.z += (desiredPos.z - self.position.z) * lerpRate;

    // Face the player
    const lookMat = new THREE.Matrix4();
    lookMat.lookAt(self.position, target.position, new THREE.Vector3(0, 1, 0));
    const lookQuat = new THREE.Quaternion().setFromRotationMatrix(lookMat);
    self.group.quaternion.slerp(lookQuat, Math.min(1, dt * 6));

    // Only fire during approach and attack phases
    let fire = false;
    if ((this.phase === 'approach' || this.phase === 'attack') && distToPlayer < 80) {
      if (now - self.lastFireTime >= this.fireRate) {
        fire = true;
      }
    }

    return { yaw: 0, pitch: 0, roll: 0, thrust: 0, fire };
  }
}
