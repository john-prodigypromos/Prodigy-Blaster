// ── Rusty AI Behavior (3D) ───────────────────────────────
// Enemy flies in front of the player, strafing side to side.
// Keeps itself visible and "in your face" rather than chasing from behind.

import * as THREE from 'three';
import { Ship3D } from '../../entities/Ship3D';
import { AI } from '../../config';
import type { AIBehavior3D } from '../AIBehavior3D';
import type { ShipInput } from '../../systems/PhysicsSystem3D';

const _toTarget = new THREE.Vector3();
const _toSelf = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _desiredPos = new THREE.Vector3();

export class RustyBehavior3D implements AIBehavior3D {
  private aimAccuracy: number;
  private fireRate: number;
  private chaseRange: number;
  private strafeTimer = Math.random() * Math.PI * 2; // offset per enemy
  private preferredDist = 20 + Math.random() * 10; // ideal distance from player

  constructor(
    aimAccuracy: number = AI.RUSTY_AIM_ACCURACY,
    fireRate: number = AI.RUSTY_FIRE_RATE,
    chaseRange: number = AI.RUSTY_CHASE_RANGE,
  ) {
    this.aimAccuracy = aimAccuracy;
    this.fireRate = fireRate;
    this.chaseRange = chaseRange;
  }

  update(self: Ship3D, target: Ship3D, dt: number, now: number): ShipInput & { fire: boolean } {
    if (!self.alive || !target.alive) {
      return { yaw: 0, pitch: 0, roll: 0, thrust: 0, fire: false };
    }

    this.strafeTimer += dt * 0.8;

    // Where the player is looking
    const playerForward = target.getForward();

    // Calculate a position IN FRONT of the player, offset by strafe
    const strafeX = Math.sin(this.strafeTimer) * 12;
    const strafeY = Math.cos(this.strafeTimer * 0.7) * 5;
    _desiredPos.copy(target.position)
      .addScaledVector(playerForward, this.preferredDist)
      .x += strafeX;
    _desiredPos.y += strafeY;

    // Direction from self to desired position
    _toTarget.subVectors(_desiredPos, self.position);
    const distToDesired = _toTarget.length();

    // Direction from self to player (for aiming/firing)
    _toSelf.subVectors(target.position, self.position);
    const distToPlayer = _toSelf.length();

    // Current forward
    _forward.set(0, 0, 1).applyQuaternion(self.group.quaternion);

    // ── Steering: face toward the player (not the desired position) ──
    _toSelf.normalize();
    const cross = new THREE.Vector3().crossVectors(_forward, _toSelf);
    const dot = _forward.dot(_toSelf);
    const angleDiff = Math.acos(Math.min(1, Math.max(-1, dot)));

    const localCross = cross.clone().applyQuaternion(self.group.quaternion.clone().invert());

    let yaw = 0;
    let pitch = 0;

    const steerStrength = Math.min(1, angleDiff * 1.5);

    if (Math.abs(localCross.y) > 0.03) {
      yaw = Math.sign(localCross.y) * steerStrength;
      yaw = Math.max(-1, Math.min(1, yaw));
    }
    if (Math.abs(localCross.x) > 0.03) {
      pitch = -Math.sign(localCross.x) * steerStrength * 0.6;
      pitch = Math.max(-1, Math.min(1, pitch));
    }

    // ── Thrust: move toward desired position (in front of player) ──
    let thrust = 0;
    if (distToDesired > 5) {
      // Check if desired pos is roughly ahead of us
      const toDesiredNorm = _toTarget.clone().normalize();
      const dotForward = _forward.dot(toDesiredNorm);
      thrust = dotForward > -0.3 ? 0.7 : 0.3;
    }

    // If too far from player, rush in
    if (distToPlayer > 40) {
      thrust = 1;
    }
    // If way too close, slow down
    if (distToPlayer < 8) {
      thrust = -0.2;
    }

    // ── Fire: when facing player and close enough ──
    let fire = false;
    if (angleDiff < 0.4 && distToPlayer < this.chaseRange) {
      if (now - self.lastFireTime >= this.fireRate) {
        fire = true;
      }
    }

    return { yaw, pitch, roll: 0, thrust, fire };
  }
}
