// ── Procedural Ship Geometry ─────────────────────────────
// Creates detailed 3D ship models entirely from code.
// Player ship: sleek fighter with swept wings + dual engines.
// Enemy ship: rounder, menacing with angular wings + single engine.

import * as THREE from 'three';

/** Player fighter — ~4K triangles, elongated with swept wings and cockpit dome. */
export function createPlayerShipGeometry(): THREE.Group {
  const group = new THREE.Group();

  // ── Fuselage ── compact body
  const bodyGeo = new THREE.CylinderGeometry(0.8, 0.5, 1.6, 8, 1);
  bodyGeo.rotateX(Math.PI / 2);
  const fuselage = new THREE.Mesh(bodyGeo);
  fuselage.name = 'fuselage';
  fuselage.position.z = 0;
  group.add(fuselage);

  // ── Nose tip ──
  const noseGeo = new THREE.ConeGeometry(0.5, 0.4, 8);
  noseGeo.rotateX(-Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo);
  nose.name = 'nose';
  nose.position.z = 1.0;
  group.add(nose);

  // ── Cockpit dome ──
  const cockpitGeo = new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const cockpit = new THREE.Mesh(cockpitGeo);
  cockpit.name = 'cockpit';
  cockpit.position.set(0, 0.7, 0);
  group.add(cockpit);

  // ── Wings ── swept back, angled
  const wingGeo = new THREE.BoxGeometry(5, 0.12, 2.5);
  // Left wing
  const leftWing = new THREE.Mesh(wingGeo);
  leftWing.name = 'wing-left';
  leftWing.position.set(-2.8, 0, -0.5);
  leftWing.rotation.z = -0.05;
  leftWing.rotation.y = -0.15;
  group.add(leftWing);

  // Right wing
  const rightWing = new THREE.Mesh(wingGeo);
  rightWing.name = 'wing-right';
  rightWing.position.set(2.8, 0, -0.5);
  rightWing.rotation.z = 0.05;
  rightWing.rotation.y = 0.15;
  group.add(rightWing);

  // ── Wing tips ── angled up
  const tipGeo = new THREE.BoxGeometry(0.12, 1.0, 1.5);
  const leftTip = new THREE.Mesh(tipGeo);
  leftTip.name = 'tip-left';
  leftTip.position.set(-5.2, 0.4, -1.0);
  group.add(leftTip);

  const rightTip = new THREE.Mesh(tipGeo);
  rightTip.name = 'tip-right';
  rightTip.position.set(5.2, 0.4, -1.0);
  group.add(rightTip);

  // ── Engine nacelles ── two cylinders at rear
  const engineGeo = new THREE.CylinderGeometry(0.4, 0.5, 2, 8);
  engineGeo.rotateX(Math.PI / 2);

  const leftEngine = new THREE.Mesh(engineGeo);
  leftEngine.name = 'engine-left';
  leftEngine.position.set(-1.2, -0.1, -3.5);
  group.add(leftEngine);

  const rightEngine = new THREE.Mesh(engineGeo);
  rightEngine.name = 'engine-right';
  rightEngine.position.set(1.2, -0.1, -3.5);
  group.add(rightEngine);

  // ── Engine nozzle glow rings ──
  const nozzleGeo = new THREE.RingGeometry(0.25, 0.5, 12);
  const leftNozzle = new THREE.Mesh(nozzleGeo);
  leftNozzle.name = 'nozzle-left';
  leftNozzle.position.set(-1.2, -0.1, -4.55);
  group.add(leftNozzle);

  const rightNozzle = new THREE.Mesh(nozzleGeo);
  rightNozzle.name = 'nozzle-right';
  rightNozzle.position.set(1.2, -0.1, -4.55);
  group.add(rightNozzle);

  return group;
}

/** Enemy ship — detailed aggressive fighter with layered hull, weapon pods, and twin engines. */
export function createEnemyShipGeometry(): THREE.Group {
  const group = new THREE.Group();

  // ── Main hull — flattened angular body ──
  const hullGeo = new THREE.SphereGeometry(1.4, 16, 12);
  hullGeo.scale(1.2, 0.5, 1.8);
  const hull = new THREE.Mesh(hullGeo);
  hull.name = 'hull';
  group.add(hull);

  // ── Upper armor plate ──
  const armorGeo = new THREE.BoxGeometry(1.6, 0.15, 2.4);
  const armor = new THREE.Mesh(armorGeo);
  armor.name = 'armor';
  armor.position.set(0, 0.4, 0);
  group.add(armor);

  // ── Forward spike / cannon barrel ──
  const spikeGeo = new THREE.CylinderGeometry(0.12, 0.25, 2.5, 8);
  spikeGeo.rotateX(-Math.PI / 2);
  const spike = new THREE.Mesh(spikeGeo);
  spike.name = 'spike';
  spike.position.z = 2.8;
  group.add(spike);

  // ── Cannon housing ──
  const cannonHousingGeo = new THREE.BoxGeometry(0.6, 0.4, 1.0);
  const cannonHousing = new THREE.Mesh(cannonHousingGeo);
  cannonHousing.name = 'hull';
  cannonHousing.position.set(0, 0, 1.8);
  group.add(cannonHousing);

  // ── Cockpit viewport (dark slit) ──
  const viewportGeo = new THREE.BoxGeometry(1.0, 0.15, 0.4);
  const viewport = new THREE.Mesh(viewportGeo);
  viewport.name = 'cockpit';
  viewport.position.set(0, 0.45, 0.8);
  group.add(viewport);

  // ── Main wings — wide, angular, swept back ──
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(5, -0.6);
  wingShape.lineTo(5.5, -1.2);
  wingShape.lineTo(4, -1.8);
  wingShape.lineTo(1, -0.8);
  wingShape.lineTo(0, 0);

  const wingExtrude = { depth: 0.15, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1 };
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, wingExtrude);

  const leftWing = new THREE.Mesh(wingGeo);
  leftWing.name = 'wing-left';
  leftWing.position.set(-0.8, -0.1, 0.3);
  leftWing.rotation.y = Math.PI;
  leftWing.rotation.x = -0.08;
  group.add(leftWing);

  const rightWingGeo = new THREE.ExtrudeGeometry(wingShape, wingExtrude);
  rightWingGeo.scale(-1, 1, 1);
  const rightWing = new THREE.Mesh(rightWingGeo);
  rightWing.name = 'wing-right';
  rightWing.position.set(0.8, -0.1, 0.3);
  rightWing.rotation.y = Math.PI;
  rightWing.rotation.x = -0.08;
  group.add(rightWing);

  // ── Wing tip fins (vertical stabilizers) ──
  const finGeo = new THREE.BoxGeometry(0.1, 0.8, 1.0);
  const leftFin = new THREE.Mesh(finGeo);
  leftFin.name = 'hull';
  leftFin.position.set(-5.2, 0.2, -0.5);
  leftFin.rotation.z = 0.15;
  group.add(leftFin);

  const rightFin = new THREE.Mesh(finGeo);
  rightFin.name = 'hull';
  rightFin.position.set(5.2, 0.2, -0.5);
  rightFin.rotation.z = -0.15;
  group.add(rightFin);

  // ── Weapon pods under wings ──
  const podGeo = new THREE.CylinderGeometry(0.2, 0.25, 1.2, 8);
  podGeo.rotateX(Math.PI / 2);

  const leftPod = new THREE.Mesh(podGeo);
  leftPod.name = 'hull';
  leftPod.position.set(-3.0, -0.5, 0.2);
  group.add(leftPod);

  const rightPod = new THREE.Mesh(podGeo);
  rightPod.name = 'hull';
  rightPod.position.set(3.0, -0.5, 0.2);
  group.add(rightPod);

  // ── Pod missile tips ──
  const missileGeo = new THREE.ConeGeometry(0.15, 0.5, 6);
  missileGeo.rotateX(-Math.PI / 2);

  const leftMissile = new THREE.Mesh(missileGeo);
  leftMissile.name = 'hull';
  leftMissile.position.set(-3.0, -0.5, 1.05);
  group.add(leftMissile);

  const rightMissile = new THREE.Mesh(missileGeo);
  rightMissile.name = 'hull';
  rightMissile.position.set(3.0, -0.5, 1.05);
  group.add(rightMissile);

  // ── Twin engines ──
  const engineGeo = new THREE.CylinderGeometry(0.45, 0.55, 1.8, 10);
  engineGeo.rotateX(Math.PI / 2);

  const leftEngine = new THREE.Mesh(engineGeo);
  leftEngine.name = 'engine';
  leftEngine.position.set(-1.0, -0.15, -2.2);
  group.add(leftEngine);

  const rightEngine = new THREE.Mesh(engineGeo);
  rightEngine.name = 'engine';
  rightEngine.position.set(1.0, -0.15, -2.2);
  group.add(rightEngine);

  // ── Engine nozzle glow rings ──
  const nozzleGeo = new THREE.RingGeometry(0.25, 0.55, 12);

  const leftNozzle = new THREE.Mesh(nozzleGeo);
  leftNozzle.name = 'nozzle';
  leftNozzle.position.set(-1.0, -0.15, -3.15);
  group.add(leftNozzle);

  const rightNozzle = new THREE.Mesh(nozzleGeo);
  rightNozzle.name = 'nozzle';
  rightNozzle.position.set(1.0, -0.15, -3.15);
  group.add(rightNozzle);

  // ── Engine housing fairings ──
  const fairingGeo = new THREE.BoxGeometry(0.3, 0.5, 2.2);

  const leftFairing = new THREE.Mesh(fairingGeo);
  leftFairing.name = 'hull';
  leftFairing.position.set(-1.0, 0.2, -1.8);
  group.add(leftFairing);

  const rightFairing = new THREE.Mesh(fairingGeo);
  rightFairing.name = 'hull';
  rightFairing.position.set(1.0, 0.2, -1.8);
  group.add(rightFairing);

  // ── Rear tail fin ──
  const tailGeo = new THREE.BoxGeometry(0.08, 1.0, 0.8);
  const tail = new THREE.Mesh(tailGeo);
  tail.name = 'hull';
  tail.position.set(0, 0.6, -2.5);
  group.add(tail);

  // ── Underside detail panels ──
  const panelGeo = new THREE.BoxGeometry(0.8, 0.08, 1.4);
  const leftPanel = new THREE.Mesh(panelGeo);
  leftPanel.name = 'hull';
  leftPanel.position.set(-0.6, -0.45, -0.3);
  group.add(leftPanel);

  const rightPanel = new THREE.Mesh(panelGeo);
  rightPanel.name = 'hull';
  rightPanel.position.set(0.6, -0.45, -0.3);
  group.add(rightPanel);

  return group;
}
