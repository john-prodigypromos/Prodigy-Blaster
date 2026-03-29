// ── Enemy Ship Renderer (TIE-inspired) ──────────────────
// Draws a detailed TIE-fighter-inspired enemy ship.
// Ship points UP (negative Y), centered at (0,0).
// Approximate size: 70px wide × 70px tall.

import {
  SeededRNG,
  drawPanelLine,
  drawRivetRow,
  drawGreebleBlock,
  drawScorchMark,
  drawWeathering,
  drawSpecularHighlight,
  drawThrusterFlame,
  darkenColor,
  lightenColor,
} from './ShipDrawHelpers';

/** Canvas size for one frame (with padding) */
export const ENEMY_FRAME_SIZE = 120;

/**
 * Draw the full enemy ship onto ctx at origin (0,0) pointing UP.
 */
export function drawEnemyShip(ctx: CanvasRenderingContext2D, seed = 137): void {
  const rng = new SeededRNG(seed);

  // ── 1. WING PANELS (behind ball) ──────────────────────
  drawWingPanel(ctx, -1, rng);  // Left wing
  drawWingPanel(ctx, 1, rng);   // Right wing

  // ── 2. WING PYLONS ────────────────────────────────────
  drawWingPylons(ctx);

  // ── 3. CENTRAL BALL COCKPIT ───────────────────────────
  drawBallCockpit(ctx, rng);

  // ── 4. CHIN GUNS ──────────────────────────────────────
  drawChinGuns(ctx);

  // ── 5. REAR ENGINE ────────────────────────────────────
  drawRearEngine(ctx);

  // ── 6. HULL SPECULAR ──────────────────────────────────
  drawSpecularHighlight(ctx, -3, -4, 4, 4, 0.15);
}

// ── Sub-drawing functions ────────────────────────────────

function drawWingPanel(
  ctx: CanvasRenderingContext2D,
  side: number, // -1 = left, 1 = right
  rng: SeededRNG,
): void {
  ctx.save();

  const xSign = side;
  const panelX = xSign * 22;  // center of panel
  const panelW = 14;
  const panelH = 48;
  const left = panelX - panelW / 2;
  const top = -panelH / 2;

  // Wing face gradient (dark gunmetal)
  const faceGrad = ctx.createLinearGradient(left, top, left + panelW, top + panelH);
  faceGrad.addColorStop(0, '#4a4e54');
  faceGrad.addColorStop(0.3, '#3e4248');
  faceGrad.addColorStop(0.7, '#363a40');
  faceGrad.addColorStop(1, '#2e3238');

  ctx.fillStyle = faceGrad;
  // Tall flat hexagonal-ish wing shape
  ctx.beginPath();
  ctx.moveTo(panelX - panelW / 2, -panelH * 0.4);
  ctx.lineTo(panelX - panelW / 2 + 2, -panelH / 2);
  ctx.lineTo(panelX + panelW / 2 - 2, -panelH / 2);
  ctx.lineTo(panelX + panelW / 2, -panelH * 0.4);
  ctx.lineTo(panelX + panelW / 2, panelH * 0.4);
  ctx.lineTo(panelX + panelW / 2 - 2, panelH / 2);
  ctx.lineTo(panelX - panelW / 2 + 2, panelH / 2);
  ctx.lineTo(panelX - panelW / 2, panelH * 0.4);
  ctx.closePath();
  ctx.fill();

  // Wing outline
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Outer edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  const outerX = panelX + xSign * panelW / 2;
  ctx.moveTo(outerX, -panelH * 0.38);
  ctx.lineTo(outerX, panelH * 0.38);
  ctx.stroke();

  // ── Structural bracing (diagonal lines) ──
  ctx.strokeStyle = 'rgba(80,84,90,0.6)';
  ctx.lineWidth = 0.8;
  // Primary diagonal
  ctx.beginPath();
  ctx.moveTo(left + 1, top + 4);
  ctx.lineTo(left + panelW - 1, top + panelH - 4);
  ctx.stroke();
  // Cross diagonal
  ctx.beginPath();
  ctx.moveTo(left + panelW - 1, top + 4);
  ctx.lineTo(left + 1, top + panelH - 4);
  ctx.stroke();
  // Horizontal brace
  ctx.beginPath();
  ctx.moveTo(left + 1, 0);
  ctx.lineTo(left + panelW - 1, 0);
  ctx.stroke();

  // Panel seams along braces
  drawPanelLine(ctx, left + 1, top + 4, left + panelW - 1, top + panelH - 4, 0.15, 0.06);
  drawPanelLine(ctx, left + panelW - 1, top + 4, left + 1, top + panelH - 4, 0.15, 0.06);

  // ── Solar panel grid (subtle horizontal lines) ──
  ctx.strokeStyle = 'rgba(60,70,80,0.25)';
  ctx.lineWidth = 0.3;
  for (let gy = top + 3; gy < top + panelH - 3; gy += 3) {
    ctx.beginPath();
    // Clip to wing shape
    const fraction = Math.abs((gy) / (panelH / 2));
    const inset = fraction > 0.8 ? (fraction - 0.8) * 10 : 0;
    ctx.moveTo(left + 1 + inset, gy);
    ctx.lineTo(left + panelW - 1 - inset, gy);
    ctx.stroke();
  }

  // Vertical grid lines
  ctx.strokeStyle = 'rgba(60,70,80,0.15)';
  for (let gx = left + 3; gx < left + panelW - 2; gx += 4) {
    ctx.beginPath();
    ctx.moveTo(gx, top + 5);
    ctx.lineTo(gx, top + panelH - 5);
    ctx.stroke();
  }

  // ── Rivets along bracing ──
  drawRivetRow(ctx, left + 1, 0, left + panelW - 1, 0, 5, 0.5, '#5a5e64');
  drawRivetRow(ctx, panelX, top + 4, panelX, top + panelH - 4, 8, 0.5, '#5a5e64');

  // ── Greeble blocks ──
  drawGreebleBlock(ctx, left + 2, -8, 4, 3, rng, '#3e4248');
  drawGreebleBlock(ctx, left + 2, 5, 5, 3, rng, '#3e4248');
  drawGreebleBlock(ctx, left + 6, -16, 4, 3, rng, '#444850');

  // ── Weathering ──
  drawWeathering(ctx, left, top + 4, panelW, panelH - 8, rng, 8, 0.06);

  // ── Scorch marks ──
  drawScorchMark(ctx, panelX + 2, -5, 3, 0.08);
  drawScorchMark(ctx, panelX - 3, 10, 2.5, 0.07);

  ctx.restore();
}

function drawWingPylons(ctx: CanvasRenderingContext2D): void {
  ctx.save();

  // Left pylon
  drawPylon(ctx, -1);
  // Right pylon
  drawPylon(ctx, 1);

  ctx.restore();
}

function drawPylon(ctx: CanvasRenderingContext2D, side: number): void {
  const x1 = side * 9;   // ball edge
  const x2 = side * 15;  // wing edge
  const pylonH = 5;

  // Pylon body
  const pylonGrad = ctx.createLinearGradient(x1, -pylonH / 2, x1, pylonH / 2);
  pylonGrad.addColorStop(0, '#5a5e64');
  pylonGrad.addColorStop(0.5, '#484c52');
  pylonGrad.addColorStop(1, '#3a3e44');

  ctx.fillStyle = pylonGrad;
  ctx.beginPath();
  ctx.moveTo(x1, -pylonH / 2);
  ctx.lineTo(x2, -pylonH / 2 - 1);
  ctx.lineTo(x2, pylonH / 2 + 1);
  ctx.lineTo(x1, pylonH / 2);
  ctx.closePath();
  ctx.fill();

  // Pylon outline
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Top edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  ctx.moveTo(x1, -pylonH / 2);
  ctx.lineTo(x2, -pylonH / 2 - 1);
  ctx.stroke();

  // Structural rivet
  drawRivetRow(ctx, x1 + side * 1, 0, x2 - side * 1, 0, 3, 0.4, '#5a5e64');
}

function drawBallCockpit(ctx: CanvasRenderingContext2D, rng: SeededRNG): void {
  ctx.save();

  const ballR = 10;

  // Ball body with radial gradient (light top-left, dark bottom-right)
  const bodyGrad = ctx.createRadialGradient(-3, -3, 0, 0, 0, ballR);
  bodyGrad.addColorStop(0, '#6a7078');
  bodyGrad.addColorStop(0.5, '#4a4e54');
  bodyGrad.addColorStop(1, '#2e3238');

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(0, 0, ballR, 0, Math.PI * 2);
  ctx.fill();

  // Ball outline
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // ── Hexagonal viewport ──
  const vpR = 5;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const vx = Math.cos(angle) * vpR;
    const vy = Math.sin(angle) * vpR;
    if (i === 0) ctx.moveTo(vx, vy);
    else ctx.lineTo(vx, vy);
  }
  ctx.closePath();

  // Viewport interior (dark with slight gradient)
  const vpGrad = ctx.createLinearGradient(0, -vpR, 0, vpR);
  vpGrad.addColorStop(0, '#1a2028');
  vpGrad.addColorStop(1, '#0e1418');
  ctx.fillStyle = vpGrad;
  ctx.fill();

  // Viewport border
  ctx.strokeStyle = '#5a6068';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Inner frame (smaller hexagon)
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const vx = Math.cos(angle) * (vpR * 0.7);
    const vy = Math.sin(angle) * (vpR * 0.7);
    if (i === 0) ctx.moveTo(vx, vy);
    else ctx.lineTo(vx, vy);
  }
  ctx.closePath();
  ctx.strokeStyle = 'rgba(90,96,104,0.4)';
  ctx.lineWidth = 0.4;
  ctx.stroke();

  // Cross lines inside viewport
  ctx.strokeStyle = 'rgba(90,96,104,0.3)';
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  ctx.moveTo(0, -vpR * 0.8);
  ctx.lineTo(0, vpR * 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-vpR * 0.8, 0);
  ctx.lineTo(vpR * 0.8, 0);
  ctx.stroke();

  ctx.restore();

  // ── Rivets around cockpit rim ──
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 / 12) * i;
    const rx = Math.cos(angle) * (ballR - 1.5);
    const ry = Math.sin(angle) * (ballR - 1.5);
    drawRivetRow(ctx, rx, ry, rx, ry, 1, 0.5, '#5a5e64', 0.25, 0.4);
  }

  // ── Ball specular highlight ──
  drawSpecularHighlight(ctx, -4, -4, 3, 3, 0.2);

  // Secondary specular
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.ellipse(-2, -6, 2, 1, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // ── Ball panel seams (radial) ──
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i + Math.PI / 4;
    const x1 = Math.cos(angle) * vpR * 1.2;
    const y1 = Math.sin(angle) * vpR * 1.2;
    const x2 = Math.cos(angle) * (ballR - 0.5);
    const y2 = Math.sin(angle) * (ballR - 0.5);
    drawPanelLine(ctx, x1, y1, x2, y2, 0.15, 0.06);
  }

  // ── Ball weathering ──
  drawWeathering(ctx, -ballR, -ballR, ballR * 2, ballR * 2, rng, 6, 0.05);

  // ── Scorch mark on ball ──
  drawScorchMark(ctx, 4, 3, 3, 0.08);

  ctx.restore();
}

function drawChinGuns(ctx: CanvasRenderingContext2D): void {
  ctx.save();

  // Two chin-mounted guns below the ball cockpit
  for (const xOff of [-3, 3]) {
    // Barrel
    ctx.fillStyle = '#484c52';
    ctx.fillRect(xOff - 0.8, -14, 1.6, 6);

    // Barrel highlight
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(xOff - 0.8, -14, 0.5, 6);

    // Muzzle
    ctx.fillStyle = '#3a3e44';
    ctx.beginPath();
    ctx.arc(xOff, -14, 1, 0, Math.PI * 2);
    ctx.fill();

    // Muzzle glow
    ctx.fillStyle = 'rgba(255,80,40,0.25)';
    ctx.beginPath();
    ctx.arc(xOff, -14.5, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawRearEngine(ctx: CanvasRenderingContext2D): void {
  ctx.save();

  // Engine nozzle at rear of ball
  ctx.fillStyle = '#3a3e44';
  ctx.beginPath();
  ctx.ellipse(0, 10, 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nozzle rim
  ctx.strokeStyle = '#2a2e34';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Inner glow
  ctx.fillStyle = 'rgba(255,100,40,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 3, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Thruster flame (shorter than player's)
  drawThrusterFlame(ctx, 0, 11, 5, 12,
    '#ffffff', '#ff8844', '#cc4422');

  ctx.restore();
}
