// ── Enemy Ship Renderer (TIE-inspired) ──────────────────
// Draws a detailed TIE-fighter-inspired enemy ship.
// Ship points UP (negative Y), centered at (0,0).
// Approximate size: 140px wide × 140px tall.

import {
  SeededRNG,
  drawPanelLine,
  drawRivetRow,
  drawGreebleBlock,
  drawScorchMark,
  drawWeathering,
  drawSpecularHighlight,
  drawThrusterFlame,
  drawHullPlating,
  darkenColor,
  lightenColor,
} from './ShipDrawHelpers';

/** Canvas size for one frame (with padding) */
export const ENEMY_FRAME_SIZE = 220;

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
  drawSpecularHighlight(ctx, -5, -7, 7, 7, 0.15);
}

// ── Sub-drawing functions ────────────────────────────────

function drawWingPanel(
  ctx: CanvasRenderingContext2D,
  side: number, // -1 = left, 1 = right
  rng: SeededRNG,
): void {
  ctx.save();

  const xSign = side;
  const panelX = xSign * 44;  // center of panel (scaled up)
  const panelW = 28;          // 28px wide
  const panelH = 96;          // 96px tall (at least 90px)
  const left = panelX - panelW / 2;
  const top = -panelH / 2;

  // Wing face gradient (dark gunmetal)
  const faceGrad = ctx.createLinearGradient(left, top, left + panelW, top + panelH);
  faceGrad.addColorStop(0, '#4e5258');
  faceGrad.addColorStop(0.2, '#464a50');
  faceGrad.addColorStop(0.4, '#3e4248');
  faceGrad.addColorStop(0.6, '#383c42');
  faceGrad.addColorStop(0.8, '#32363c');
  faceGrad.addColorStop(1, '#2e3238');

  ctx.fillStyle = faceGrad;
  // Tall flat hexagonal-ish wing shape with corner bevels
  ctx.beginPath();
  ctx.moveTo(panelX - panelW / 2, -panelH * 0.4);
  ctx.lineTo(panelX - panelW / 2 + 3, -panelH * 0.46);  // corner bevel
  ctx.lineTo(panelX - panelW / 2 + 5, -panelH / 2);
  ctx.lineTo(panelX + panelW / 2 - 5, -panelH / 2);
  ctx.lineTo(panelX + panelW / 2 - 3, -panelH * 0.46);  // corner bevel
  ctx.lineTo(panelX + panelW / 2, -panelH * 0.4);
  ctx.lineTo(panelX + panelW / 2, panelH * 0.4);
  ctx.lineTo(panelX + panelW / 2 - 3, panelH * 0.46);   // corner bevel
  ctx.lineTo(panelX + panelW / 2 - 5, panelH / 2);
  ctx.lineTo(panelX - panelW / 2 + 5, panelH / 2);
  ctx.lineTo(panelX - panelW / 2 + 3, panelH * 0.46);   // corner bevel
  ctx.lineTo(panelX - panelW / 2, panelH * 0.4);
  ctx.closePath();
  ctx.fill();

  // Wing outline
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Edge frame highlight on outer rim
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  const outerX = panelX + xSign * panelW / 2;
  ctx.moveTo(outerX, -panelH * 0.38);
  ctx.lineTo(outerX, panelH * 0.38);
  ctx.stroke();

  // Inner edge frame
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 0.4;
  const innerX = panelX - xSign * panelW / 2;
  ctx.beginPath();
  ctx.moveTo(innerX, -panelH * 0.38);
  ctx.lineTo(innerX, panelH * 0.38);
  ctx.stroke();

  // ── Structural bracing (2 diagonal + 1 horizontal — thick structural members) ──
  ctx.strokeStyle = 'rgba(80,84,90,0.7)';
  ctx.lineWidth = 1.2;
  // Primary diagonal
  ctx.beginPath();
  ctx.moveTo(left + 2, top + 6);
  ctx.lineTo(left + panelW - 2, top + panelH - 6);
  ctx.stroke();
  // Cross diagonal
  ctx.beginPath();
  ctx.moveTo(left + panelW - 2, top + 6);
  ctx.lineTo(left + 2, top + panelH - 6);
  ctx.stroke();
  // Horizontal brace (thick)
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(left + 2, 0);
  ctx.lineTo(left + panelW - 2, 0);
  ctx.stroke();

  // Panel seams along braces
  drawPanelLine(ctx, left + 2, top + 6, left + panelW - 2, top + panelH - 6, 0.18, 0.08);
  drawPanelLine(ctx, left + panelW - 2, top + 6, left + 2, top + panelH - 6, 0.18, 0.08);
  drawPanelLine(ctx, left + 2, 0, left + panelW - 2, 0, 0.18, 0.08);

  // Panel line details between seams (additional structural detail)
  drawPanelLine(ctx, left + panelW / 2, top + 6, left + panelW / 2, top + panelH - 6, 0.12, 0.05);
  drawPanelLine(ctx, left + 2, -panelH / 4, left + panelW - 2, -panelH / 4, 0.10, 0.04);
  drawPanelLine(ctx, left + 2, panelH / 4, left + panelW - 2, panelH / 4, 0.10, 0.04);

  // ── Solar panel grid (horizontal lines every 4px) ──
  ctx.strokeStyle = 'rgba(60,70,80,0.28)';
  ctx.lineWidth = 0.4;
  for (let gy = top + 4; gy < top + panelH - 4; gy += 4) {
    ctx.beginPath();
    const fraction = Math.abs(gy / (panelH / 2));
    const inset = fraction > 0.8 ? (fraction - 0.8) * 12 : 0;
    ctx.moveTo(left + 2 + inset, gy);
    ctx.lineTo(left + panelW - 2 - inset, gy);
    ctx.stroke();
  }

  // Vertical grid lines every 6px
  ctx.strokeStyle = 'rgba(60,70,80,0.18)';
  ctx.lineWidth = 0.3;
  for (let gx = left + 4; gx < left + panelW - 3; gx += 6) {
    ctx.beginPath();
    ctx.moveTo(gx, top + 7);
    ctx.lineTo(gx, top + panelH - 7);
    ctx.stroke();
  }

  // ── Rivets along bracing (3+ rows per wing panel) ──
  drawRivetRow(ctx, left + 2, 0, left + panelW - 2, 0, 8, 0.6, '#5a5e64');
  drawRivetRow(ctx, panelX, top + 6, panelX, top + panelH - 6, 14, 0.6, '#5a5e64');
  drawRivetRow(ctx, left + 2, -panelH / 4, left + panelW - 2, -panelH / 4, 6, 0.5, '#5a5e64');
  drawRivetRow(ctx, left + 2, panelH / 4, left + panelW - 2, panelH / 4, 6, 0.5, '#5a5e64');

  // ── Greeble blocks (4+ per wing panel) ──
  drawGreebleBlock(ctx, left + 3, -16, 7, 5, rng, '#3e4248');
  drawGreebleBlock(ctx, left + 3, 10, 8, 5, rng, '#3e4248');
  drawGreebleBlock(ctx, left + 12, -32, 7, 5, rng, '#444850');
  drawGreebleBlock(ctx, left + 12, 24, 7, 5, rng, '#444850');
  drawGreebleBlock(ctx, left + 4, -38, 6, 4, rng, '#3a3e44');
  drawGreebleBlock(ctx, left + 4, 32, 6, 4, rng, '#3a3e44');

  // ── Hull plating outlines on wing ──
  drawHullPlating(ctx, left + 2, top + 8, panelW - 4, 18, 0.06);
  drawHullPlating(ctx, left + 2, top + 28, panelW - 4, 16, 0.05);
  drawHullPlating(ctx, left + 2, top + 48, panelW - 4, 16, 0.05);
  drawHullPlating(ctx, left + 2, top + 66, panelW - 4, 18, 0.06);

  // ── Weathering (12+ scratches per wing panel) ──
  drawWeathering(ctx, left + 1, top + 6, panelW - 2, panelH - 12, rng, 12, 0.06);

  // ── Scorch marks ──
  drawScorchMark(ctx, panelX + 4, -10, 5, 0.08);
  drawScorchMark(ctx, panelX - 5, 18, 4, 0.07);
  drawScorchMark(ctx, panelX + 2, -30, 3.5, 0.06);
  drawScorchMark(ctx, panelX - 3, 34, 4, 0.07);

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
  const x1 = side * 18;   // ball edge
  const x2 = side * 30;   // wing edge
  const pylonH = 10;

  // Pylon body
  const pylonGrad = ctx.createLinearGradient(x1, -pylonH / 2, x1, pylonH / 2);
  pylonGrad.addColorStop(0, '#5e6268');
  pylonGrad.addColorStop(0.3, '#505458');
  pylonGrad.addColorStop(0.7, '#484c52');
  pylonGrad.addColorStop(1, '#3e4248');

  ctx.fillStyle = pylonGrad;
  ctx.beginPath();
  ctx.moveTo(x1, -pylonH / 2);
  ctx.lineTo(x2, -pylonH / 2 - 2);
  ctx.lineTo(x2, pylonH / 2 + 2);
  ctx.lineTo(x1, pylonH / 2);
  ctx.closePath();
  ctx.fill();

  // Pylon outline
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 0.7;
  ctx.stroke();

  // Top edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(x1, -pylonH / 2);
  ctx.lineTo(x2, -pylonH / 2 - 2);
  ctx.stroke();

  // Bottom edge shadow
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(x1, pylonH / 2);
  ctx.lineTo(x2, pylonH / 2 + 2);
  ctx.stroke();

  // 2 structural rivet rows
  drawRivetRow(ctx, x1 + side * 2, -2, x2 - side * 2, -2, 5, 0.5, '#5a5e64');
  drawRivetRow(ctx, x1 + side * 2, 2, x2 - side * 2, 2, 5, 0.5, '#5a5e64');

  // Cross-brace line
  ctx.strokeStyle = 'rgba(80,84,90,0.5)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x1 + side * 2, -pylonH / 2 + 1);
  ctx.lineTo(x2 - side * 2, pylonH / 2);
  ctx.stroke();
}

function drawBallCockpit(ctx: CanvasRenderingContext2D, rng: SeededRNG): void {
  ctx.save();

  const ballR = 20; // ~24px radius (up from 10)

  // Ball body with radial gradient (light top-left, dark bottom-right)
  const bodyGrad = ctx.createRadialGradient(-5, -5, 0, 0, 0, ballR);
  bodyGrad.addColorStop(0, '#727880');
  bodyGrad.addColorStop(0.3, '#5a5e64');
  bodyGrad.addColorStop(0.6, '#4a4e54');
  bodyGrad.addColorStop(1, '#2e3238');

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(0, 0, ballR, 0, Math.PI * 2);
  ctx.fill();

  // Ball outline
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // ── Hexagonal viewport (larger) ──
  const vpR = 10;
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

  // Viewport interior (dark with gradient)
  const vpGrad = ctx.createLinearGradient(0, -vpR, 0, vpR);
  vpGrad.addColorStop(0, '#1e2830');
  vpGrad.addColorStop(0.5, '#141c22');
  vpGrad.addColorStop(1, '#0e1418');
  ctx.fillStyle = vpGrad;
  ctx.fill();

  // Viewport thick border frame
  ctx.strokeStyle = '#5a6068';
  ctx.lineWidth = 1.2;
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
  ctx.strokeStyle = 'rgba(90,96,104,0.45)';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Cross lines inside viewport (vertical + horizontal)
  ctx.strokeStyle = 'rgba(90,96,104,0.35)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, -vpR * 0.85);
  ctx.lineTo(0, vpR * 0.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-vpR * 0.85, 0);
  ctx.lineTo(vpR * 0.85, 0);
  ctx.stroke();

  // Additional diagonal cross lines
  ctx.strokeStyle = 'rgba(90,96,104,0.2)';
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  ctx.moveTo(-vpR * 0.6, -vpR * 0.6);
  ctx.lineTo(vpR * 0.6, vpR * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(vpR * 0.6, -vpR * 0.6);
  ctx.lineTo(-vpR * 0.6, vpR * 0.6);
  ctx.stroke();

  ctx.restore();

  // ── 16 rivets around cockpit rim ──
  for (let i = 0; i < 16; i++) {
    const angle = (Math.PI * 2 / 16) * i;
    const rx = Math.cos(angle) * (ballR - 2.5);
    const ry = Math.sin(angle) * (ballR - 2.5);
    drawRivetRow(ctx, rx, ry, rx, ry, 1, 0.6, '#5a5e64', 0.3, 0.45);
  }

  // ── 4 radial panel seams from viewport to rim ──
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i + Math.PI / 4;
    const x1 = Math.cos(angle) * vpR * 1.15;
    const y1 = Math.sin(angle) * vpR * 1.15;
    const x2 = Math.cos(angle) * (ballR - 1);
    const y2 = Math.sin(angle) * (ballR - 1);
    drawPanelLine(ctx, x1, y1, x2, y2, 0.18, 0.08);
  }

  // ── Panel line details between radial seams ──
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i;
    const midR = (vpR * 1.15 + ballR - 1) / 2;
    const x1 = Math.cos(angle - 0.3) * midR;
    const y1 = Math.sin(angle - 0.3) * midR;
    const x2 = Math.cos(angle + 0.3) * midR;
    const y2 = Math.sin(angle + 0.3) * midR;
    drawPanelLine(ctx, x1, y1, x2, y2, 0.10, 0.04);
  }

  // ── Small circular detail panels on ball surface ──
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i + Math.PI / 8;
    const cx = Math.cos(angle) * (ballR * 0.72);
    const cy = Math.sin(angle) * (ballR * 0.72);
    ctx.strokeStyle = 'rgba(80,86,94,0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = darkenColor('#4a4e54', 0.08);
    ctx.fill();
  }

  // ── Ball specular highlight (primary + secondary) ──
  drawSpecularHighlight(ctx, -7, -7, 6, 6, 0.22);

  // Secondary specular
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath();
  ctx.ellipse(-4, -12, 4, 2, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Tertiary subtle specular
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath();
  ctx.ellipse(5, 8, 3, 2, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // ── Ball weathering + scorch ──
  drawWeathering(ctx, -ballR, -ballR, ballR * 2, ballR * 2, rng, 10, 0.05);
  drawScorchMark(ctx, 8, 6, 5, 0.08);
  drawScorchMark(ctx, -6, 10, 4, 0.06);
  drawScorchMark(ctx, -10, -4, 3.5, 0.07);

  ctx.restore();
}

function drawChinGuns(ctx: CanvasRenderingContext2D): void {
  ctx.save();

  // Two chin-mounted guns below the ball cockpit — longer barrels with mounting brackets
  for (const xOff of [-6, 6]) {
    // Mounting bracket
    ctx.fillStyle = '#484c52';
    ctx.fillRect(xOff - 2.5, -22, 5, 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(xOff - 2.5, -22, 5, 5);

    // Barrel (longer)
    ctx.fillStyle = '#484c52';
    ctx.fillRect(xOff - 1.5, -34, 3, 14);

    // Barrel highlight
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(xOff - 1.5, -34, 1, 14);

    // Barrel shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(xOff + 0.8, -34, 0.8, 14);

    // Barrel rings (3 detail rings)
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.6;
    for (let r = 0; r < 3; r++) {
      const ringY = -24 - r * 4;
      ctx.beginPath();
      ctx.moveTo(xOff - 2, ringY);
      ctx.lineTo(xOff + 2, ringY);
      ctx.stroke();
    }

    // Muzzle bore
    ctx.fillStyle = '#2a2e34';
    ctx.beginPath();
    ctx.arc(xOff, -34, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Muzzle glow indicator
    ctx.fillStyle = 'rgba(255,80,40,0.3)';
    ctx.beginPath();
    ctx.arc(xOff, -34.5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Muzzle glow halo
    const muzzleGlow = ctx.createRadialGradient(xOff, -34, 0, xOff, -34, 4);
    muzzleGlow.addColorStop(0, 'rgba(255,80,40,0.12)');
    muzzleGlow.addColorStop(1, 'rgba(255,80,40,0)');
    ctx.fillStyle = muzzleGlow;
    ctx.beginPath();
    ctx.arc(xOff, -34, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawRearEngine(ctx: CanvasRenderingContext2D): void {
  ctx.save();

  // Engine housing
  ctx.fillStyle = '#3a3e44';
  ctx.beginPath();
  ctx.ellipse(0, 18, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Engine housing rim detail
  const rimGrad = ctx.createLinearGradient(-8, 18, 8, 18);
  rimGrad.addColorStop(0, '#3a3e44');
  rimGrad.addColorStop(0.3, '#4a4e54');
  rimGrad.addColorStop(0.5, '#585c62');
  rimGrad.addColorStop(0.7, '#4a4e54');
  rimGrad.addColorStop(1, '#2a2e34');
  ctx.strokeStyle = rimGrad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 20, 8, 3.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Inner nozzle glow (larger)
  const nozzleGlow = ctx.createRadialGradient(0, 20, 0, 0, 20, 6);
  nozzleGlow.addColorStop(0, 'rgba(255,140,60,0.6)');
  nozzleGlow.addColorStop(0.5, 'rgba(255,100,40,0.4)');
  nozzleGlow.addColorStop(1, 'rgba(255,60,20,0.1)');
  ctx.fillStyle = nozzleGlow;
  ctx.beginPath();
  ctx.ellipse(0, 20, 6, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Thruster flame cone (~22px long)
  drawThrusterFlame(ctx, 0, 22, 10, 22,
    '#ffffff', '#ff8844', '#cc4422');

  ctx.restore();
}
