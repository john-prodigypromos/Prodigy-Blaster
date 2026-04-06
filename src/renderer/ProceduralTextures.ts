// ── Procedural Textures ──────────────────────────────────
// Canvas-generated normal + roughness maps for ship hulls.
// No external texture files needed.

import * as THREE from 'three';

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Creates a high-detail normal map with panel lines, rivets, scratches, and micro-detail. */
export function createNormalMap(size = 1024, seed = 101): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rng = seededRng(seed);

  // Base normal (flat — pointing straight out: 128, 128, 255)
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, size, size);

  // Primary panel lines — deep grooves
  ctx.strokeStyle = 'rgb(118, 118, 238)';
  ctx.lineWidth = 3;
  const panelSize = size / 8;
  for (let x = panelSize; x < size; x += panelSize + rng() * 20 - 10) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = panelSize; y < size; y += panelSize + rng() * 20 - 10) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  // Secondary panel lines — finer sub-divisions
  ctx.strokeStyle = 'rgb(123, 123, 248)';
  ctx.lineWidth = 1;
  const subPanelSize = size / 16;
  for (let x = subPanelSize; x < size; x += subPanelSize + rng() * 10 - 5) {
    if (rng() > 0.4) continue; // not every sub-panel line shows
    ctx.beginPath();
    ctx.moveTo(x, rng() * size * 0.3);
    ctx.lineTo(x, size - rng() * size * 0.3);
    ctx.stroke();
  }

  // Rivets — more, scattered along panel edges
  ctx.fillStyle = 'rgb(142, 142, 255)';
  for (let i = 0; i < 120; i++) {
    const rx = rng() * size;
    const ry = rng() * size;
    const rr = 1.5 + rng() * 2.5;
    ctx.beginPath();
    ctx.arc(rx, ry, rr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scratches — more numerous, varied length
  ctx.lineWidth = 1;
  for (let i = 0; i < 60; i++) {
    const alpha = 0.3 + rng() * 0.5;
    ctx.strokeStyle = `rgba(135, 125, 245, ${alpha})`;
    ctx.beginPath();
    const sx = rng() * size;
    const sy = rng() * size;
    const len = 20 + rng() * 80;
    const angle = rng() * Math.PI * 2;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len);
    ctx.stroke();
  }

  // Micro surface noise — subtle bumps across entire surface
  for (let i = 0; i < 200; i++) {
    const nx = rng() * size;
    const ny = rng() * size;
    const nr = 2 + rng() * 6;
    const bump = rng() > 0.5 ? 'rgb(132, 132, 255)' : 'rgb(124, 124, 252)';
    const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
    g.addColorStop(0, bump);
    g.addColorStop(1, 'rgba(128, 128, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** Creates a high-detail roughness map — shiny base with grooves, wear, and heat damage. */
export function createRoughnessMap(size = 1024, seed = 202): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rng = seededRng(seed);

  // Base roughness: 0.3 (shiny metal) = rgb(77, 77, 77)
  ctx.fillStyle = 'rgb(77, 77, 77)';
  ctx.fillRect(0, 0, size, size);

  // Panel line grooves: rougher (0.7) = rgb(179, 179, 179)
  ctx.strokeStyle = 'rgb(179, 179, 179)';
  ctx.lineWidth = 4;
  const panelSize = size / 8;
  for (let x = panelSize; x < size; x += panelSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = panelSize; y < size; y += panelSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  // Wear patches — more, varied roughness
  for (let i = 0; i < 35; i++) {
    const wx = rng() * size;
    const wy = rng() * size;
    const wr = 10 + rng() * 50;
    const roughVal = 130 + Math.floor(rng() * 80);
    const g = ctx.createRadialGradient(wx, wy, 0, wx, wy, wr);
    g.addColorStop(0, `rgb(${roughVal}, ${roughVal}, ${roughVal})`);
    g.addColorStop(0.6, `rgba(${roughVal}, ${roughVal}, ${roughVal}, 0.4)`);
    g.addColorStop(1, 'rgba(77, 77, 77, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(wx - wr, wy - wr, wr * 2, wr * 2);
  }

  // Heat discoloration near engine area (bottom of texture = rougher)
  const heatGrad = ctx.createLinearGradient(0, size * 0.7, 0, size);
  heatGrad.addColorStop(0, 'rgba(77, 77, 77, 0)');
  heatGrad.addColorStop(1, 'rgba(160, 160, 160, 0.3)');
  ctx.fillStyle = heatGrad;
  ctx.fillRect(0, size * 0.7, size, size * 0.3);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}
