// ── 3D AI Behavior Interface ─────────────────────────────

import { Ship3D } from '../entities/Ship3D';
import type { ShipInput } from '../systems/PhysicsSystem3D';

export interface AIBehavior3D {
  update(self: Ship3D, target: Ship3D, dt: number, now: number): ShipInput & { fire: boolean };
}
