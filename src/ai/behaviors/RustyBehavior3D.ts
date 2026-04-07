// ── Rusty AI Behavior (3D) ───────────────────────────────
// Cinematic dogfight AI: enemies stay visible at mid-range,
// cruise in your POV, and gradually close distance for
// longer, more visual engagements. Think Top Gun, not ambush.

import * as THREE from 'three';
import { Ship3D } from '../../entities/Ship3D';
import { AI } from '../../config';
import type { AIBehavior3D } from '../AIBehavior3D';
import type { ShipInput } from '../../systems/PhysicsSystem3D';

let enemyIndex = 0;

type Phase = 'cruise' | 'closing' | 'dogfight' | 'breakaway';

export class RustyBehavior3D implements AIBehavior3D {
  private fireRate: number;
  private timer = 0;
  private phase: Phase = 'cruise'; // start visible, cruising at mid-range
  private phaseTimer = 0;
  private idx: number;
  private orbitAngle = 0;

  constructor(
    _aimAccuracy: number = AI.RUSTY_AIM_ACCURACY,
    fireRate: number = AI.RUSTY_FIRE_RATE,
    _chaseRange: number = AI.RUSTY_CHASE_RANGE,
  ) {
    this.fireRate = fireRate;
    this.idx = enemyIndex++;
    this.timer = this.idx * 3;
    this.orbitAngle = this.idx * Math.PI * 0.7; // stagger orbits
  }

  update(self: Ship3D, target: Ship3D, dt: number, now: number): ShipInput & { fire: boolean } {
    if (!self.alive || !target.alive) {
      return { yaw: 0, pitch: 0, roll: 0, thrust: 0, fire: false };
    }

    this.timer += dt;
    this.phaseTimer += dt;
    this.orbitAngle += dt * (0.3 + this.idx * 0.1);

    const distToPlayer = self.position.distanceTo(target.position);

    // ── Phase transitions — aggressive engagement with shorter passive phases ──
    if (this.phase === 'cruise' && this.phaseTimer > 3 + this.idx * 1.5) {
      // Short cruise — close in quickly
      this.phase = 'closing';
      this.phaseTimer = 0;
    } else if (this.phase === 'closing' && (distToPlayer < 80 || this.phaseTimer > 5)) {
      // Close enough for dogfight
      this.phase = 'dogfight';
      this.phaseTimer = 0;
    } else if (this.phase === 'dogfight' && this.phaseTimer > 12) {
      // Long dogfight, then break away for another pass
      this.phase = 'breakaway';
      this.phaseTimer = 0;
    } else if (this.phase === 'breakaway' && (distToPlayer > 200 || this.phaseTimer > 3)) {
      // Quick breakaway, then back to closing (skip cruise on repeat passes)
      this.phase = 'closing';
      this.phaseTimer = 0;
    }

    const desiredPos = new THREE.Vector3();

    switch (this.phase) {
      case 'cruise': {
        // Fly ahead of the player — clearly visible in their forward view
        // Orbits in the player's forward hemisphere so they can always see the enemy
        const playerFwd = target.getForward();
        const playerRight = new THREE.Vector3(-playerFwd.z, 0, playerFwd.x);
        const orbitRadius = 200 + this.idx * 40;
        const lateralSwing = Math.sin(this.orbitAngle) * orbitRadius * 0.6;
        const verticalWave = Math.sin(this.timer * 0.4 + this.idx) * 30;

        // Position ahead of player + lateral swing
        desiredPos.copy(target.position);
        desiredPos.addScaledVector(playerFwd, orbitRadius); // always in front
        desiredPos.addScaledVector(playerRight, lateralSwing);
        desiredPos.y += verticalWave;
        break;
      }

      case 'closing': {
        // Gradually close distance while staying in the player's forward view
        const playerFwd = target.getForward();
        const playerRight = new THREE.Vector3(-playerFwd.z, 0, playerFwd.x);
        const closingProgress = Math.min(1, this.phaseTimer / 8);
        const forwardDist = 200 * (1 - closingProgress * 0.7); // 200 → 60
        const weaveSpeed = 1.5 + this.idx * 0.3;
        const lateralWeave = Math.sin(this.timer * weaveSpeed) * 40;
        const verticalWeave = Math.cos(this.timer * weaveSpeed * 0.6) * 20;

        // Stay ahead but get closer
        desiredPos.copy(target.position);
        desiredPos.addScaledVector(playerFwd, forwardDist);
        desiredPos.addScaledVector(playerRight, lateralWeave);
        desiredPos.y += verticalWeave;
        break;
      }

      case 'dogfight': {
        // Close-range maneuvering — fly around the player at combat distance
        // Mix of orbiting and darting behind
        const playerFwd = target.getForward();
        const combatRadius = 40 + Math.sin(this.timer * 0.8) * 25; // 15-65 range — tighter

        // Orbit with bias toward getting behind the player
        const behindBias = playerFwd.clone().multiplyScalar(-40);
        const weaveRight = new THREE.Vector3(-playerFwd.z, 0, playerFwd.x);
        const orbitOffset = Math.sin(this.orbitAngle * 1.5) * combatRadius;
        const verticalBias = Math.cos(this.idx * 1.7 + this.timer * 0.6) * 25;

        desiredPos.set(
          target.position.x + behindBias.x + weaveRight.x * orbitOffset,
          target.position.y + verticalBias,
          target.position.z + behindBias.z + weaveRight.z * orbitOffset,
        );
        break;
      }

      case 'breakaway': {
        // Fly away from the player to reset — pull out to visible range
        const awayDir = self.position.clone().sub(target.position);
        if (awayDir.length() < 0.1) awayDir.set(1, 0, 0);
        awayDir.normalize();

        // Fly outward with a slight curve
        const curveRight = new THREE.Vector3(-awayDir.z, 0, awayDir.x);
        const curve = Math.sin(this.timer * 2) * 50;

        desiredPos.copy(self.position);
        desiredPos.addScaledVector(awayDir, 120);
        desiredPos.addScaledVector(curveRight, curve);
        desiredPos.y += Math.sin(this.timer * 1.5) * 20;
        break;
      }
    }

    // Smooth movement — slower lerp for visible, cinematic flight paths
    const lerpRate = this.phase === 'dogfight'
      ? Math.min(1, dt * 2.5) // snappier in close combat
      : Math.min(1, dt * 1.2); // smooth and visible at range
    self.position.x += (desiredPos.x - self.position.x) * lerpRate;
    self.position.y += (desiredPos.y - self.position.y) * lerpRate;
    self.position.z += (desiredPos.z - self.position.z) * lerpRate;

    // Face the player (or face direction of travel during breakaway)
    const lookTarget = this.phase === 'breakaway' ? desiredPos : target.position;
    const lookMat = new THREE.Matrix4();
    lookMat.lookAt(self.position, lookTarget, new THREE.Vector3(0, 1, 0));
    const lookQuat = new THREE.Quaternion().setFromRotationMatrix(lookMat);
    self.group.quaternion.slerp(lookQuat, Math.min(1, dt * 4));

    // Fire during closing and dogfight phases, at longer range
    let fire = false;
    if ((this.phase === 'closing' || this.phase === 'dogfight') && distToPlayer < 200) {
      if (now - self.lastFireTime >= this.fireRate) {
        fire = true;
      }
    }

    return { yaw: 0, pitch: 0, roll: 0, thrust: 0, fire };
  }
}
