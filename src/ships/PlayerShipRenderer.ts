// ── Player Ship Renderer (X-Wing inspired) ──────────────
// Draws a highly detailed player ship to a canvas context.
// Ship points UP (negative Y), centered at (0,0).
// Approximate size: 80px wide × 100px tall (plus thruster flame).

import {
  SeededRNG,
  drawPanelLine,
  drawRivetRow,
  drawGreebleBlock,
  drawScorchMark,
  drawWeathering,
  drawSpecularHighlight,
  drawThrusterFlame,
  drawNavLight,
} from './ShipDrawHelpers';

/** Canvas size needed for one frame (with padding for flame + glow) */
export const PLAYER_FRAME_SIZE = 140;

/**
 * Draw the full player ship onto ctx at origin (0,0) pointing UP.
 * Caller should translate to center of frame before calling.
 */
export function drawPlayerShip(ctx: CanvasRenderingContext2D, seed = 42): void {
  const rng = new SeededRNG(seed);

  // ── 1. MAIN FUSELAGE ──────────────────────────────────
  drawFuselage(ctx);

  // ── 2. PANEL SEAMS ─────────────────────────────────────
  drawFuselagePanelSeams(ctx);

  // ── 3. RIVET ROWS ─────────────────────────────────────
  drawFuselageRivets(ctx);

  // ── 4. GREEBLE BLOCKS ─────────────────────────────────
  drawFuselageGreebles(ctx, rng);

  // ── 5. WEATHERING & SCORCH MARKS ──────────────────────
  drawFuselageWeathering(ctx, rng);

  // ── 6. DORSAL RIDGE ───────────────────────────────────
  drawDorsalRidge(ctx);

  // ── 7. S-FOILS (WINGS) ────────────────────────────────
  drawSFoils(ctx, rng);

  // ── 8. LASER CANNONS ──────────────────────────────────
  drawLaserCannons(ctx);

  // ── 9. ENGINE HOUSINGS & THRUSTERS ────────────────────
  drawEngines(ctx);

  // ── 10. COCKPIT ───────────────────────────────────────
  drawCockpit(ctx);

  // ── 11. ASTROMECH DOME ────────────────────────────────
  drawAstromech(ctx);

  // ── 12. NOSE CONE & SENSOR ────────────────────────────
  drawNoseCone(ctx);

  // ── 13. NAVIGATION LIGHTS ─────────────────────────────
  drawNavLights(ctx);

  // ── 14. SPECULAR HIGHLIGHTS ───────────────────────────
  drawHullSpeculars(ctx);
}

// ── Sub-drawing functions ────────────────────────────────

function drawFuselage(ctx: CanvasRenderingContext2D): void {
  ctx.save();

  // Multi-stop hull gradient (light grey nose → dark grey engines)
  const grad = ctx.createLinearGradient(0, -42, 0, 38);
  grad.addColorStop(0, '#c8ccd0');
  grad.addColorStop(0.3, '#b0b4b8');
  grad.addColorStop(0.6, '#949a9e');
  grad.addColorStop(1, '#787e84');

  ctx.fillStyle = grad;
  ctx.beginPath();
  // Tapered nose → wider body → engine section
  ctx.moveTo(0, -45);        // nose tip
  ctx.lineTo(6, -38);
  ctx.lineTo(9, -28);
  ctx.lineTo(10, -15);
  ctx.lineTo(11, 0);
  ctx.lineTo(12, 20);
  ctx.lineTo(11, 32);        // engine housing start
  ctx.lineTo(9, 38);         // engine rear
  ctx.lineTo(-9, 38);
  ctx.lineTo(-11, 32);
  ctx.lineTo(-12, 20);
  ctx.lineTo(-11, 0);
  ctx.lineTo(-10, -15);
  ctx.lineTo(-9, -28);
  ctx.lineTo(-6, -38);
  ctx.closePath();
  ctx.fill();

  // Hull outline
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Inner edge highlight (left side catching light)
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-5, -40);
  ctx.lineTo(-10, -15);
  ctx.lineTo(-11, 10);
  ctx.stroke();

  ctx.restore();
}

function drawFuselagePanelSeams(ctx: CanvasRenderingContext2D): void {
  // Horizontal seams
  drawPanelLine(ctx, -10, -20, 10, -20);
  drawPanelLine(ctx, -11, -5, 11, -5);
  drawPanelLine(ctx, -12, 10, 12, 10);
  drawPanelLine(ctx, -11, 25, 11, 25);
  drawPanelLine(ctx, -9, 35, 9, 35);

  // Longitudinal center seam
  drawPanelLine(ctx, 0, -40, 0, 35, 0.15, 0.08);

  // Side panel seams
  drawPanelLine(ctx, -6, -30, -6, 30, 0.12, 0.06);
  drawPanelLine(ctx, 6, -30, 6, 30, 0.12, 0.06);
}

function drawFuselageRivets(ctx: CanvasRenderingContext2D): void {
  // Along horizontal seams
  drawRivetRow(ctx, -8, -20, 8, -20, 6, 0.6);
  drawRivetRow(ctx, -9, -5, 9, -5, 7, 0.6);
  drawRivetRow(ctx, -10, 10, 10, 10, 8, 0.6);
  drawRivetRow(ctx, -9, 25, 9, 25, 7, 0.6);

  // Along center seam
  drawRivetRow(ctx, 0, -35, 0, 30, 10, 0.5, '#8a9098', 0.2, 0.4);

  // Side seam rivets
  drawRivetRow(ctx, -6, -25, -6, 25, 8, 0.5);
  drawRivetRow(ctx, 6, -25, 6, 25, 8, 0.5);
}

function drawFuselageGreebles(ctx: CanvasRenderingContext2D, rng: SeededRNG): void {
  // Place greeble blocks in various hull panels
  drawGreebleBlock(ctx, -5, -17, 4, 3, rng, '#8a9098');
  drawGreebleBlock(ctx, 2, -17, 4, 3, rng, '#8a9098');
  drawGreebleBlock(ctx, -5, -2, 3, 4, rng, '#7a8088');
  drawGreebleBlock(ctx, 3, -2, 4, 3, rng, '#7a8088');
  drawGreebleBlock(ctx, -4, 12, 3, 3, rng, '#6a7078');
  drawGreebleBlock(ctx, 2, 12, 4, 3, rng, '#6a7078');
  drawGreebleBlock(ctx, -8, 5, 3, 4, rng, '#808890');
  drawGreebleBlock(ctx, 6, 5, 3, 4, rng, '#808890');
  // Additional detail blocks
  drawGreebleBlock(ctx, -4, 27, 3, 3, rng, '#6a7078');
  drawGreebleBlock(ctx, 2, 27, 3, 3, rng, '#6a7078');
}

function drawFuselageWeathering(ctx: CanvasRenderingContext2D, rng: SeededRNG): void {
  // Micro-scratches across the hull
  drawWeathering(ctx, -10, -35, 20, 70, rng, 15, 0.08);

  // Scorch marks (battle damage hints)
  drawScorchMark(ctx, 5, -12, 4, 0.12);
  drawScorchMark(ctx, -7, 8, 3.5, 0.1);
  drawScorchMark(ctx, 3, 22, 3, 0.08);
  drawScorchMark(ctx, -4, -25, 2.5, 0.1);
}

function drawDorsalRidge(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  // Raised center ridge running nose to cockpit
  const grad = ctx.createLinearGradient(-2, 0, 2, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0.05)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.15)');
  grad.addColorStop(1, 'rgba(0,0,0,0.05)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.lineTo(2, -35);
  ctx.lineTo(2, -10);
  ctx.lineTo(0, -8);
  ctx.lineTo(-2, -10);
  ctx.lineTo(-2, -35);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSFoils(ctx: CanvasRenderingContext2D, rng: SeededRNG): void {
  // Four S-foils (split wings) — upper pair and lower pair
  // Upper-left wing
  drawWing(ctx, -1, -1, rng);
  // Upper-right wing
  ctx.save();
  ctx.scale(-1, 1);
  drawWing(ctx, -1, -1, rng);
  ctx.restore();
  // Lower-left wing
  drawWing(ctx, -1, 1, rng);
  // Lower-right wing
  ctx.save();
  ctx.scale(-1, 1);
  drawWing(ctx, -1, 1, rng);
  ctx.restore();
}

function drawWing(
  ctx: CanvasRenderingContext2D,
  _side: number,
  verticalOffset: number,
  rng: SeededRNG,
): void {
  const yOff = verticalOffset * 4; // Slight vertical split between upper/lower foils

  ctx.save();

  // Wing body
  const wingGrad = ctx.createLinearGradient(-12, 0, -38, 0);
  wingGrad.addColorStop(0, '#a0a4a8');
  wingGrad.addColorStop(0.5, '#909498');
  wingGrad.addColorStop(1, '#808488');

  ctx.fillStyle = wingGrad;
  ctx.beginPath();
  ctx.moveTo(-11, -8 + yOff);   // wing root leading edge
  ctx.lineTo(-36, -14 + yOff);  // wingtip leading edge
  ctx.lineTo(-38, -12 + yOff);  // wingtip
  ctx.lineTo(-36, -6 + yOff);   // wingtip trailing edge
  ctx.lineTo(-11, 2 + yOff);    // wing root trailing edge
  ctx.closePath();
  ctx.fill();

  // Wing outline
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Leading edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(-12, -8 + yOff);
  ctx.lineTo(-35, -14 + yOff);
  ctx.stroke();

  // Red stripe marking
  ctx.fillStyle = 'rgba(180,40,30,0.7)';
  ctx.beginPath();
  ctx.moveTo(-14, -7 + yOff);
  ctx.lineTo(-32, -12.5 + yOff);
  ctx.lineTo(-32, -10.5 + yOff);
  ctx.lineTo(-14, -5 + yOff);
  ctx.closePath();
  ctx.fill();

  // Second thin red stripe
  ctx.fillStyle = 'rgba(180,40,30,0.5)';
  ctx.beginPath();
  ctx.moveTo(-14, -3 + yOff);
  ctx.lineTo(-30, -7 + yOff);
  ctx.lineTo(-30, -6 + yOff);
  ctx.lineTo(-14, -2 + yOff);
  ctx.closePath();
  ctx.fill();

  // Wing panel seam
  drawPanelLine(ctx, -14, -4 + yOff, -34, -9 + yOff, 0.2, 0.1);

  // Wing rivets
  drawRivetRow(ctx, -14, -4 + yOff, -33, -9 + yOff, 5, 0.5);

  // Wing greebles
  drawGreebleBlock(ctx, -22, -8 + yOff, 4, 3, rng, '#808488');

  // Wing weathering
  drawWeathering(ctx, -35, -14 + yOff, 22, 14, rng, 4, 0.06);

  ctx.restore();
}

function drawLaserCannons(ctx: CanvasRenderingContext2D): void {
  // Four laser cannons at wingtips
  const positions = [
    { x: -37, y: -17 }, // upper-left
    { x: 37, y: -17 },  // upper-right
    { x: -37, y: -9 },  // lower-left
    { x: 37, y: -9 },   // lower-right
  ];

  for (const pos of positions) {
    ctx.save();

    // Barrel
    ctx.fillStyle = '#606468';
    ctx.fillRect(pos.x - 1.2, pos.y - 8, 2.4, 10);

    // Barrel highlight
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(pos.x - 1.2, pos.y - 8, 0.8, 10);

    // Barrel shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(pos.x + 0.5, pos.y - 8, 0.8, 10);

    // Muzzle tip
    ctx.fillStyle = '#505458';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y - 8, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Muzzle glow indicator
    ctx.fillStyle = 'rgba(255,60,30,0.3)';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y - 8, 1, 0, Math.PI * 2);
    ctx.fill();

    // Barrel mounting ring
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(pos.x - 1.5, pos.y - 3);
    ctx.lineTo(pos.x + 1.5, pos.y - 3);
    ctx.stroke();

    ctx.restore();
  }
}

function drawEngines(ctx: CanvasRenderingContext2D): void {
  // Two engine housings on either side of rear fuselage
  const engines = [
    { x: -6, y: 32 },
    { x: 6, y: 32 },
  ];

  for (const eng of engines) {
    ctx.save();

    // Engine housing
    ctx.fillStyle = '#686c70';
    ctx.fillRect(eng.x - 4, eng.y - 4, 8, 10);

    // Grating lines
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.4;
    for (let i = 0; i < 5; i++) {
      const gy = eng.y - 2 + i * 2;
      ctx.beginPath();
      ctx.moveTo(eng.x - 3, gy);
      ctx.lineTo(eng.x + 3, gy);
      ctx.stroke();
    }

    // Nozzle rim
    ctx.strokeStyle = '#484c50';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(eng.x, eng.y + 6, 4, 1.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Inner nozzle glow
    ctx.fillStyle = 'rgba(255,140,50,0.4)';
    ctx.beginPath();
    ctx.ellipse(eng.x, eng.y + 6, 3, 1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thruster flame
    drawThrusterFlame(ctx, eng.x, eng.y + 7, 6, 18);

    ctx.restore();
  }
}

function drawCockpit(ctx: CanvasRenderingContext2D): void {
  ctx.save();

  // Cockpit frame/surround
  ctx.fillStyle = '#585c60';
  ctx.beginPath();
  ctx.ellipse(0, -22, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Canopy glass — multi-pane
  const glassGrad = ctx.createLinearGradient(0, -28, 0, -16);
  glassGrad.addColorStop(0, 'rgba(120,180,220,0.6)');
  glassGrad.addColorStop(0.5, 'rgba(80,140,180,0.5)');
  glassGrad.addColorStop(1, 'rgba(40,80,120,0.4)');

  ctx.fillStyle = glassGrad;
  ctx.beginPath();
  ctx.ellipse(0, -22, 4, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Canopy frame lines (dividing panes)
  ctx.strokeStyle = 'rgba(60,64,68,0.6)';
  ctx.lineWidth = 0.5;
  // Vertical frame
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(0, -16);
  ctx.stroke();
  // Horizontal frame
  ctx.beginPath();
  ctx.moveTo(-3.5, -22);
  ctx.lineTo(3.5, -22);
  ctx.stroke();
  // Cross frame
  ctx.beginPath();
  ctx.moveTo(-2.5, -25);
  ctx.lineTo(2.5, -25);
  ctx.stroke();

  // Canopy reflection
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.ellipse(-1.5, -24, 1.5, 2.5, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Instrument glow (warm green/amber at bottom of canopy)
  const instrGrad = ctx.createRadialGradient(0, -18, 0, 0, -18, 3);
  instrGrad.addColorStop(0, 'rgba(100,200,80,0.2)');
  instrGrad.addColorStop(1, 'rgba(100,200,80,0)');
  ctx.fillStyle = instrGrad;
  ctx.beginPath();
  ctx.arc(0, -18, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawAstromech(ctx: CanvasRenderingContext2D): void {
  ctx.save();

  // Dome body
  const domeGrad = ctx.createRadialGradient(-0.5, -12.5, 0, 0, -12, 3);
  domeGrad.addColorStop(0, '#e0e4e8');
  domeGrad.addColorStop(1, '#4060a0');

  ctx.fillStyle = domeGrad;
  ctx.beginPath();
  ctx.arc(0, -12, 3, 0, Math.PI * 2);
  ctx.fill();

  // Dome outline
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Eye (photoreceptor)
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(0, -13, 1, 0, Math.PI * 2);
  ctx.fill();

  // Eye lens highlight
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.arc(-0.3, -13.3, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Dome ring
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.ellipse(0, -11.5, 2.8, 0.8, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawNoseCone(ctx: CanvasRenderingContext2D): void {
  ctx.save();

  // Sensor window at nose tip
  ctx.fillStyle = 'rgba(40,60,80,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, -42, 2.5, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sensor glass highlight
  ctx.fillStyle = 'rgba(120,180,220,0.3)';
  ctx.beginPath();
  ctx.ellipse(-0.5, -42.5, 1, 0.7, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Nose edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(-2, -41);
  ctx.quadraticCurveTo(0, -46, 2, -41);
  ctx.stroke();

  ctx.restore();
}

function drawNavLights(ctx: CanvasRenderingContext2D): void {
  // Red port (left) light
  drawNavLight(ctx, -12, 0, 1.2, '#ff2200', 5, 0.3);
  // Green starboard (right) light
  drawNavLight(ctx, 12, 0, 1.2, '#00dd44', 5, 0.3);
  // White tail light
  drawNavLight(ctx, 0, 36, 1, '#ffffff', 3, 0.2);
}

function drawHullSpeculars(ctx: CanvasRenderingContext2D): void {
  // Main hull specular (upper-left light source)
  drawSpecularHighlight(ctx, -4, -18, 5, 12, 0.12);
  // Secondary smaller specular
  drawSpecularHighlight(ctx, -2, 5, 3, 6, 0.08);
}
