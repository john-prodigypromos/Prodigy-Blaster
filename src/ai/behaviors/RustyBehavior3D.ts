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

    // ── Phase transitions — longer, more gradual engagement ──
    if (this.phase === 'cruise' && this.phaseTimer > 6 + this.idx * 2) {
      // After cruising visibly, start closing in
      this.phase = 'closing';
      this.phaseTimer = 0;
    } else if (this.phase === 'closing' && (distToPlayer < 80 || this.phaseTimer > 8)) {
      // Close enough for dogfight
      this.phase = 'dogfight';
      this.phaseTimer = 0;
    } else if (this.phase === 'dogfight' && this.phaseTimer > 10) {
      // Long dogfight, then break away for another pass
      this.phase = 'breakaway';
      this.phaseTimer = 0;
    } else if (this.phase === 'breakaway' && (distToPlayer > 250 || this.phaseTimer > 4)) {
      // Pull out to visible range, then cruise again
      this.phase = 'cruise';
      this.phaseTimer = 0;
    }

    const desiredPos = new THREE.Vector3();

    switch (this.phase) {
      case 'cruise': {
        // Orbit the player at mid-range — clearly visible, building tension
        // Enemy flies in wide arcs around the player like a circling predator
        const orbitRadius = 250 + this.idx * 60;
        const verticalWave = Math.sin(this.timer * 0.4 + this.idx) * 40;

        desiredPos.set(
          target.position.x + Math.cos(this.orbitAngle) * orbitRadius,
          target.position.y + verticalWave,
          target.position.z + Math.sin(this.orbitAngle) * orbitRadius,
        );
        break;
      }

      case 'closing': {
        // Gradually spiral inward toward the player — the chase
        // Shrinks orbit radius over time while weaving
        const closingProgress = Math.min(1, this.phaseTimer / 8);
        const radius = 250 * (1 - closingProgress * 0.7); // 250 → 75
        const weaveSpeed = 1.5 + this.idx * 0.3;
        const lateralWeave = Math.sin(this.timer * weaveSpeed) * 20;
        const verticalWeave = Math.cos(this.timer * weaveSpeed * 0.6) * 15;

        const toPlayer = target.position.clone().sub(self.position);
        if (toPlayer.length() > 0.1) toPlayer.normalize();
        const right = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);

        // Aim ahead of the player but offset to the side
        desiredPos.copy(target.position);
        desiredPos.addScaledVector(right, Math.cos(this.orbitAngle) * radius);
        desiredPos.y += Math.sin(this.orbitAngle) * radius * 0.4 + verticalWeave;
        desiredPos.addScaledVector(right, lateralWeave);
        break;
      }

      case 'dogfight': {
        // Close-range maneuvering — fly around the player at combat distance
        // Mix of orbiting and darting behind
        const playerFwd = target.getForward();
        const combatRadius = 60 + Math.sin(this.timer * 0.8) * 30; // 30-90 range

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
