// ── Bolo Tie Boss AI (Level 1) ───────────────────────────
// Brute: ram charges, wide turns, slow but hits hard.
// Telegraphed charge with engine flare, 3x collision damage.

import * as THREE from 'three';
import { Ship3D } from '../../entities/Ship3D';
import type { AIBehavior3D } from '../AIBehavior3D';
import type { ShipInput } from '../../systems/PhysicsSystem3D';

type Phase = 'dogfight' | 'charge_telegraph' | 'charging' | 'charge_cooldown' | 'breakaway';

export class BoloTieBehavior3D implements AIBehavior3D {
  private fireRate: number;
  private phase: Phase = 'dogfight';
  private phaseTimer = 0;
  private timer = 0;
  private orbitAngle = 0;
  private chargeDir = new THREE.Vector3();
  private chargeCooldown = 5;

  constructor(
    _aimAccuracy: number,
    fireRate: number,
    _chaseRange: number,
  ) {
    this.fireRate = fireRate;
  }

  /** Whether a charge just landed (for 3x collision damage in ArenaLoop). */
  isCharging = false;

  update(self: Ship3D, target: Ship3D, dt: number, now: number): ShipInput & { fire: boolean } {
    if (!self.alive || !target.alive) {
      this.isCharging = false;
      return { yaw: 0, pitch: 0, roll: 0, thrust: 0, fire: false };
    }

    this.timer += dt;
    this.phaseTimer += dt;
    this.orbitAngle += dt * 0.25; // wide, slow orbit

    const distToPlayer = self.position.distanceTo(target.position);
    const desiredPos = new THREE.Vector3();
    this.isCharging = false;

    // ── Phase transitions ──
    switch (this.phase) {
      case 'dogfight':
        if (this.phaseTimer > this.chargeCooldown && distToPlayer < 300) {
          this.phase = 'charge_telegraph';
          this.phaseTimer = 0;
        }
        break;
      case 'charge_telegraph':
        if (this.phaseTimer > 0.5) {
          // Lock charge direction toward player
          this.chargeDir.subVectors(target.position, self.position).normalize();
          this.phase = 'charging';
          this.phaseTimer = 0;
        }
        break;
      case 'charging':
        if (this.phaseTimer > 1.5 || distToPlayer < 25) {
          this.phase = 'charge_cooldown';
          this.phaseTimer = 0;
        }
        break;
      case 'charge_cooldown':
        if (this.phaseTimer > 2) {
          this.phase = 'breakaway';
          this.phaseTimer = 0;
        }
        break;
      case 'breakaway':
        if (distToPlayer > 180 || this.phaseTimer > 3) {
          this.phase = 'dogfight';
          this.phaseTimer = 0;
        }
        break;
    }

    // ── Movement per phase ──
    switch (this.phase) {
      case 'dogfight': {
        // Standard orbit — wide turns (0.4x rotation feel via slow orbit)
        const playerFwd = target.getForward();
        const playerRight = new THREE.Vector3(-playerFwd.z, 0, playerFwd.x);
        const behindBias = playerFwd.clone().multiplyScalar(-30);
        const orbitOffset = Math.sin(this.orbitAngle) * 80;
        const verticalBob = Math.cos(this.timer * 0.4) * 20;

        desiredPos.set(
          target.position.x + behindBias.x + playerRight.x * orbitOffset,
          target.position.y + verticalBob,
          target.position.z + behindBias.z + playerRight.z * orbitOffset,
        );
        break;
      }

      case 'charge_telegraph': {
        // Hold position, face player — engine flare visual (handled by caller)
        desiredPos.copy(self.position);
        break;
      }

      case 'charging': {
        // Rush at 2x speed toward locked charge direction
        this.isCharging = true;
        desiredPos.copy(self.position).addScaledVector(this.chargeDir, 200 * dt * 2);

        // Direct position movement for charge (bypass lerp)
        self.position.addScaledVector(this.chargeDir, 160 * dt);

        // Face charge direction
        const lookMat = new THREE.Matrix4();
        const lookTarget = self.position.clone().add(this.chargeDir);
        lookMat.lookAt(self.position, lookTarget, new THREE.Vector3(0, 1, 0));
        const lookQuat = new THREE.Quaternion().setFromRotationMatrix(lookMat);
        self.group.quaternion.slerp(lookQuat, Math.min(1, dt * 8));

        return { yaw: 0, pitch: 0, roll: 0, thrust: 0, fire: false };
      }

      case 'charge_cooldown': {
        // Drift forward slowly after charge
        const fwd = self.getForward();
        desiredPos.copy(self.position).addScaledVector(fwd, 40);
        break;
      }

      case 'breakaway': {
        const awayDir = self.position.clone().sub(target.position).normalize();
        const curveRight = new THREE.Vector3(-awayDir.z, 0, awayDir.x);
        desiredPos.copy(self.position);
        desiredPos.addScaledVector(awayDir, 100);
        desiredPos.addScaledVector(curveRight, Math.sin(this.timer * 1.5) * 40);
        break;
      }
    }

    // Smooth movement (slower lerp = wider turns)
    const lerpRate = Math.min(1, dt * 1.5);
    self.position.x += (desiredPos.x - self.position.x) * lerpRate;
    self.position.y += (desiredPos.y - self.position.y) * lerpRate;
    self.position.z += (desiredPos.z - self.position.z) * lerpRate;

    // Face the player
    const lookMat = new THREE.Matrix4();
    lookMat.lookAt(self.position, target.position, new THREE.Vector3(0, 1, 0));
    const lookQuat = new THREE.Quaternion().setFromRotationMatrix(lookMat);
    self.group.quaternion.slerp(lookQuat, Math.min(1, dt * 3));

    // Fire during dogfight and charge_cooldown
    let fire = false;
    if ((this.phase === 'dogfight' || this.phase === 'charge_cooldown') && distToPlayer < 200) {
      if (now - self.lastFireTime >= this.fireRate) {
        fire = true;
      }
    }

    return { yaw: 0, pitch: 0, roll: 0, thrust: 0, fire };
  }
}
