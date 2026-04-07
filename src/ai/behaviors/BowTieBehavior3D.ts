// ── Bow Tie Boss AI (Level 2) ────────────────────────────
// Ghost: hit-and-run from the fog, fast, lower HP.
// Dives in, fires a 2-second burst, retreats into fog.

import * as THREE from 'three';
import { Ship3D } from '../../entities/Ship3D';
import type { AIBehavior3D } from '../AIBehavior3D';
import type { ShipInput } from '../../systems/PhysicsSystem3D';

type Phase = 'hidden' | 'approach' | 'attack' | 'retreat';

export class BowTieBehavior3D implements AIBehavior3D {
  private fireRate: number;
  private phase: Phase = 'hidden';
  private phaseTimer = 0;
  private timer = 0;
  private retreatTarget = new THREE.Vector3();
  private approachDir = new THREE.Vector3();

  // Fog visibility range — enemies beyond this are "hidden"
  private readonly FOG_RANGE = 180;

  constructor(
    _aimAccuracy: number,
    fireRate: number,
    _chaseRange: number,
  ) {
    this.fireRate = fireRate;
    this.phaseTimer = 2; // Start hidden briefly then attack
  }

  update(self: Ship3D, target: Ship3D, dt: number, now: number): ShipInput & { fire: boolean } {
    if (!self.alive || !target.alive) {
      return { yaw: 0, pitch: 0, roll: 0, thrust: 0, fire: false };
    }

    this.timer += dt;
    this.phaseTimer += dt;

    const distToPlayer = self.position.distanceTo(target.position);
    const desiredPos = new THREE.Vector3();

    // ── Phase transitions ──
    switch (this.phase) {
      case 'hidden':
        if (this.phaseTimer > 3 + Math.random() * 2) {
          // Begin approach from fog
          this.phase = 'approach';
          this.phaseTimer = 0;
          // Pick approach direction — from a random angle in the fog
          const angle = Math.random() * Math.PI * 2;
          this.approachDir.set(Math.cos(angle), (Math.random() - 0.5) * 0.3, Math.sin(angle));
          // Start position at fog edge
          self.position.copy(target.position).addScaledVector(this.approachDir, this.FOG_RANGE + 50);
        }
        break;
      case 'approach':
        if (distToPlayer < 80 || this.phaseTimer > 3) {
          this.phase = 'attack';
          this.phaseTimer = 0;
        }
        break;
      case 'attack':
        if (this.phaseTimer > 2) {
          // Retreat back into fog
          this.phase = 'retreat';
          this.phaseTimer = 0;
          // Pick random retreat point beyond fog
          const retreatAngle = Math.random() * Math.PI * 2;
          this.retreatTarget.set(
            target.position.x + Math.cos(retreatAngle) * (this.FOG_RANGE + 80),
            target.position.y + (Math.random() - 0.5) * 60,
            target.position.z + Math.sin(retreatAngle) * (this.FOG_RANGE + 80),
          );
        }
        break;
      case 'retreat':
        if (distToPlayer > this.FOG_RANGE + 30 || this.phaseTimer > 3) {
          this.phase = 'hidden';
          this.phaseTimer = 0;
        }
        break;
    }

    // ── Movement per phase ──
    switch (this.phase) {
      case 'hidden': {
        // Stay beyond fog range, orbit loosely
        const angle = this.timer * 0.5;
        desiredPos.set(
          target.position.x + Math.cos(angle) * (this.FOG_RANGE + 60),
          target.position.y + Math.sin(this.timer * 0.3) * 30,
          target.position.z + Math.sin(angle) * (this.FOG_RANGE + 60),
        );
        break;
      }

      case 'approach': {
        // Dive toward player at 1.2x speed
        const toPlayer = target.position.clone().sub(self.position).normalize();
        desiredPos.copy(self.position).addScaledVector(toPlayer, 120 * dt);
        break;
      }

      case 'attack': {
        // Tight orbit around player — close range, aggressive
        const playerFwd = target.getForward();
        const playerRight = new THREE.Vector3(-playerFwd.z, 0, playerFwd.x);
        const combatRadius = 40 + Math.sin(this.timer * 1.5) * 15;
        const orbitOffset = Math.sin(this.timer * 2) * combatRadius;
        const verticalBob = Math.cos(this.timer * 1.2) * 15;

        desiredPos.set(
          target.position.x + playerRight.x * orbitOffset,
          target.position.y + verticalBob,
          target.position.z + playerRight.z * orbitOffset,
        );
        break;
      }

      case 'retreat': {
        // Flee to retreat target
        desiredPos.copy(self.position);
        const toRetreat = this.retreatTarget.clone().sub(self.position).normalize();
        desiredPos.addScaledVector(toRetreat, 140 * dt);
        break;
      }
    }

    // Smooth movement — faster lerp for this boss (quicker, sneakier)
    const lerpRate = this.phase === 'attack' ? Math.min(1, dt * 3) : Math.min(1, dt * 2);
    self.position.x += (desiredPos.x - self.position.x) * lerpRate;
    self.position.y += (desiredPos.y - self.position.y) * lerpRate;
    self.position.z += (desiredPos.z - self.position.z) * lerpRate;

    // Face direction of travel during retreat, face player otherwise
    const lookTarget = this.phase === 'retreat' ? desiredPos : target.position;
    const lookMat = new THREE.Matrix4();
    lookMat.lookAt(self.position, lookTarget, new THREE.Vector3(0, 1, 0));
    const lookQuat = new THREE.Quaternion().setFromRotationMatrix(lookMat);
    self.group.quaternion.slerp(lookQuat, Math.min(1, dt * 5));

    // Fire only during attack phase — aggressive burst
    let fire = false;
    if (this.phase === 'attack' && distToPlayer < 150) {
      if (now - self.lastFireTime >= this.fireRate * 0.7) { // faster fire during attack
        fire = true;
      }
    }

    return { yaw: 0, pitch: 0, roll: 0, thrust: 0, fire };
  }
}
