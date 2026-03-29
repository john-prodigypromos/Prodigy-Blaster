// ── Player Ship Renderer (X-Wing inspired) ──────────────
// Draws a highly detailed player ship to a canvas context.
// Ship points UP (negative Y), centered at (0,0).
// Approximate size: 160px wide × 200px tall (plus thruster flame).

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
  drawHullPlating,
  drawCrossHatching,
  drawCrossMark,
} from './ShipDrawHelpers';

/** Canvas size needed for one frame (with padding for flame + glow) */
export const PLAYER_FRAME_SIZE = 280;

/**
 * Draw the full player ship onto ctx at origin (0,0) pointing UP.
 * Caller should translate to center of frame before calling.
 */
export function drawPlayerShip(ctx: CanvasRenderingContext2D, seed = 42): void {
  const rng = new SeededRNG(seed);

  // ── 1. MAIN FUSELAGE ──────────────────────────────────
  drawFuselage(ctx);

  // ── 2. VENTRAL PANEL ──────────────────────────────────
  drawVentralPanel(ctx);

  // ── 3. HULL PLATING OUTLINES ──────────────────────────
  drawHullPlatingDetails(ctx);

  // ── 4. PANEL SEAMS ─────────────────────────────────────
  drawFuselagePanelSeams(ctx);

  // ── 5. PANEL SEAM CROSS-MARKS ──────────────────────────
  drawPanelCrossMarks(ctx);

  // ── 6. RIVET ROWS ─────────────────────────────────────
  drawFuselageRivets(ctx);

  // ── 7. GREEBLE BLOCKS ─────────────────────────────────
  drawFuselageGreebles(ctx, rng);

  // ── 8. WEATHERING & SCORCH MARKS ──────────────────────
  drawFuselageWeathering(ctx, rng);

  // ── 9. DORSAL RIDGE ───────────────────────────────────
  drawDorsalRidge(ctx);

  // ── 10. S-FOILS (WINGS) ────────────────────────────────
  drawSFoils(ctx, rng);

  // ── 11. LASER CANNONS ──────────────────────────────────
  drawLaserCannons(ctx);

  // ── 12. ENGINE HOUSINGS & THRUSTERS ────────────────────
  drawEngines(ctx);

  // ── 13. COCKPIT ───────────────────────────────────────
  drawCockpit(ctx);

  // ── 14. ASTROMECH DOME ────────────────────────────────
  drawAstromech(ctx);

  // ── 15. NOSE CONE & SENSOR ────────────────────────────
  drawNoseCone(ctx);

  // ── 16. UTAH FLAG DECAL ───────────────────────────────
  drawUtahDecal(ctx);

  // ── 17. NAVIGATION LIGHTS ─────────────────────────────
  drawNavLights(ctx);

  // ── 18. SPECULAR HIGHLIGHTS ───────────────────────────
  drawHullSpeculars(ctx);
}

// ── Sub-drawing functions ────────────────────────────────

function drawFuselage(ctx: CanvasRenderingContext2D): void {
  ctx.save();

  // Multi-stop hull gradient (light grey nose → dark grey engines) — 7 color stops
  const grad = ctx.createLinearGradient(0, -88, 0, 76);
  grad.addColorStop(0, '#d0d4d8');
  grad.addColorStop(0.15, '#c8ccd0');
  grad.addColorStop(0.3, '#b8bcc0');
  grad.addColorStop(0.45, '#a8acb0');
  grad.addColorStop(0.6, '#949a9e');
  grad.addColorStop(0.8, '#848a8e');
  grad.addColorStop(1, '#787e84');

  ctx.fillStyle = grad;
  ctx.beginPath();
  // Tapered nose → wider body → engine section (scaled up ~2x)
  ctx.moveTo(0, -92);         // nose tip
  ctx.lineTo(8, -82);
  ctx.lineTo(12, -72);
  ctx.lineTo(16, -58);
  ctx.lineTo(18, -42);
  ctx.lineTo(20, -28);
  ctx.lineTo(22, -10);
  ctx.lineTo(23, 8);
  ctx.lineTo(24, 28);
  ctx.lineTo(24, 42);
  ctx.lineTo(23, 56);
  ctx.lineTo(22, 64);         // engine housing start
  ctx.lineTo(20, 72);
  ctx.lineTo(18, 76);         // engine rear
  ctx.lineTo(-18, 76);
  ctx.lineTo(-20, 72);
  ctx.lineTo(-22, 64);
  ctx.lineTo(-23, 56);
  ctx.lineTo(-24, 42);
  ctx.lineTo(-24, 28);
  ctx.lineTo(-23, 8);
  ctx.lineTo(-22, -10);
  ctx.lineTo(-20, -28);
  ctx.lineTo(-18, -42);
  ctx.lineTo(-16, -58);
  ctx.lineTo(-12, -72);
  ctx.lineTo(-8, -82);
  ctx.closePath();
  ctx.fill();

  // Hull outline
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Inner edge highlight (left side catching light)
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-7, -82);
  ctx.lineTo(-15, -58);
  ctx.lineTo(-19, -30);
  ctx.lineTo(-22, -10);
  ctx.lineTo(-23, 20);
  ctx.stroke();

  // Right side shadow line
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(7, -82);
  ctx.lineTo(15, -58);
  ctx.lineTo(19, -30);
  ctx.lineTo(22, -10);
  ctx.lineTo(23, 20);
  ctx.stroke();

  ctx.restore();
}

function drawVentralPanel(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  // Slight color difference on bottom half of fuselage
  ctx.fillStyle = 'rgba(0,0,0,0.03)';
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.lineTo(22, 0);
  ctx.lineTo(24, 28);
  ctx.lineTo(24, 42);
  ctx.lineTo(23, 56);
  ctx.lineTo(22, 64);
  ctx.lineTo(20, 72);
  ctx.lineTo(18, 76);
  ctx.lineTo(-18, 76);
  ctx.lineTo(-20, 72);
  ctx.lineTo(-22, 64);
  ctx.lineTo(-23, 56);
  ctx.lineTo(-24, 42);
  ctx.lineTo(-24, 28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHullPlatingDetails(ctx: CanvasRenderingContext2D): void {
  // Rectangular hull plating outlines across the fuselage surface
  drawHullPlating(ctx, -18, -70, 14, 18, 0.06);
  drawHullPlating(ctx, 4, -70, 14, 18, 0.06);
  drawHullPlating(ctx, -20, -48, 16, 14, 0.05);
  drawHullPlating(ctx, 4, -48, 16, 14, 0.05);
  drawHullPlating(ctx, -22, -30, 18, 16, 0.05);
  drawHullPlating(ctx, 4, -30, 18, 16, 0.05);
  drawHullPlating(ctx, -22, -10, 18, 14, 0.04);
  drawHullPlating(ctx, 4, -10, 18, 14, 0.04);
  drawHullPlating(ctx, -22, 8, 18, 16, 0.04);
  drawHullPlating(ctx, 4, 8, 18, 16, 0.04);
  drawHullPlating(ctx, -22, 28, 18, 14, 0.04);
  drawHullPlating(ctx, 4, 28, 18, 14, 0.04);
  drawHullPlating(ctx, -20, 46, 16, 12, 0.05);
  drawHullPlating(ctx, 4, 46, 16, 12, 0.05);
  drawHullPlating(ctx, -18, 60, 14, 10, 0.05);
  drawHullPlating(ctx, 4, 60, 14, 10, 0.05);
}

function drawFuselagePanelSeams(ctx: CanvasRenderingContext2D): void {
  // 8 horizontal seams
  drawPanelLine(ctx, -16, -68, 16, -68);
  drawPanelLine(ctx, -18, -50, 18, -50);
  drawPanelLine(ctx, -20, -34, 20, -34);
  drawPanelLine(ctx, -22, -16, 22, -16);
  drawPanelLine(ctx, -23, 4, 23, 4);
  drawPanelLine(ctx, -24, 24, 24, 24);
  drawPanelLine(ctx, -23, 44, 23, 44);
  drawPanelLine(ctx, -20, 60, 20, 60);

  // Longitudinal center seam
  drawPanelLine(ctx, 0, -85, 0, 72, 0.18, 0.10);

  // Side panel seams (left and right)
  drawPanelLine(ctx, -12, -75, -12, 68, 0.14, 0.07);
  drawPanelLine(ctx, 12, -75, 12, 68, 0.14, 0.07);

  // Additional inner longitudinal seams
  drawPanelLine(ctx, -6, -70, -6, 65, 0.10, 0.05);
  drawPanelLine(ctx, 6, -70, 6, 65, 0.10, 0.05);
}

function drawPanelCrossMarks(ctx: CanvasRenderingContext2D): void {
  // Cross-marks at panel seam intersections
  const xPositions = [-12, -6, 0, 6, 12];
  const yPositions = [-68, -50, -34, -16, 4, 24, 44, 60];

  for (const xp of xPositions) {
    for (const yp of yPositions) {
      drawCrossMark(ctx, xp, yp, 1.5, 0.10);
    }
  }
}

function drawFuselageRivets(ctx: CanvasRenderingContext2D): void {
  // Along horizontal seams (6+ rows, 10+ rivets each)
  drawRivetRow(ctx, -15, -68, 15, -68, 12, 0.7);
  drawRivetRow(ctx, -17, -50, 17, -50, 14, 0.7);
  drawRivetRow(ctx, -19, -34, 19, -34, 14, 0.7);
  drawRivetRow(ctx, -21, -16, 21, -16, 16, 0.7);
  drawRivetRow(ctx, -22, 4, 22, 4, 16, 0.7);
  drawRivetRow(ctx, -23, 24, 23, 24, 16, 0.7);
  drawRivetRow(ctx, -22, 44, 22, 44, 14, 0.7);
  drawRivetRow(ctx, -19, 60, 19, 60, 12, 0.7);

  // Along center seam
  drawRivetRow(ctx, 0, -80, 0, 65, 18, 0.6, '#8a9098', 0.2, 0.4);

  // Side seam rivets
  drawRivetRow(ctx, -12, -70, -12, 65, 16, 0.6);
  drawRivetRow(ctx, 12, -70, 12, 65, 16, 0.6);
}

function drawFuselageGreebles(ctx: CanvasRenderingContext2D, rng: SeededRNG): void {
  // 14+ greeble blocks scattered across hull panels
  drawGreebleBlock(ctx, -10, -62, 7, 5, rng, '#8a9098');
  drawGreebleBlock(ctx, 4, -62, 7, 5, rng, '#8a9098');
  drawGreebleBlock(ctx, -10, -45, 6, 6, rng, '#8a9098');
  drawGreebleBlock(ctx, 5, -45, 7, 5, rng, '#8a9098');
  drawGreebleBlock(ctx, -10, -28, 5, 6, rng, '#7a8088');
  drawGreebleBlock(ctx, 5, -28, 7, 5, rng, '#7a8088');
  drawGreebleBlock(ctx, -16, -12, 6, 6, rng, '#7a8088');
  drawGreebleBlock(ctx, 10, -12, 7, 5, rng, '#7a8088');
  drawGreebleBlock(ctx, -8, 8, 5, 5, rng, '#6a7078');
  drawGreebleBlock(ctx, 4, 8, 6, 5, rng, '#6a7078');
  drawGreebleBlock(ctx, -16, 28, 6, 5, rng, '#808890');
  drawGreebleBlock(ctx, 10, 28, 6, 6, rng, '#808890');
  drawGreebleBlock(ctx, -8, 48, 5, 5, rng, '#6a7078');
  drawGreebleBlock(ctx, 4, 48, 6, 5, rng, '#6a7078');
  drawGreebleBlock(ctx, -14, 38, 5, 4, rng, '#707880');
  drawGreebleBlock(ctx, 9, 38, 5, 4, rng, '#707880');
}

function drawFuselageWeathering(ctx: CanvasRenderingContext2D, rng: SeededRNG): void {
  // 25+ micro-scratches across the hull
  drawWeathering(ctx, -22, -85, 44, 155, rng, 25, 0.08);

  // 6 scorch marks (battle damage hints)
  drawScorchMark(ctx, 10, -25, 7, 0.12);
  drawScorchMark(ctx, -14, 14, 6, 0.10);
  drawScorchMark(ctx, 6, 42, 5, 0.08);
  drawScorchMark(ctx, -8, -52, 5, 0.10);
  drawScorchMark(ctx, 15, 55, 6, 0.09);
  drawScorchMark(ctx, -5, -10, 8, 0.07);
}

function drawDorsalRidge(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  // Raised center ridge running full length of fuselage
  const grad = ctx.createLinearGradient(-4, 0, 4, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0.05)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.12)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.18)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1, 'rgba(0,0,0,0.06)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -85);
  ctx.lineTo(4, -78);
  ctx.lineTo(4, 60);
  ctx.lineTo(0, 65);
  ctx.lineTo(-4, 60);
  ctx.lineTo(-4, -78);
  ctx.closePath();
  ctx.fill();

  // Ridge edge lines
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-4, -78);
  ctx.lineTo(-4, 60);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(4, -78);
  ctx.lineTo(4, 60);
  ctx.stroke();

  ctx.restore();
}

function drawSFoils(ctx: CanvasRenderingContext2D, rng: SeededRNG): void {
  // Four S-foils (split wings) — upper pair and lower pair
  // Upper-left wing
  drawWing(ctx, -1, -1, rng);
  // Upper-right wing (mirrored)
  ctx.save();
  ctx.scale(-1, 1);
  drawWing(ctx, -1, -1, rng);
  ctx.restore();
  // Lower-left wing
  drawWing(ctx, -1, 1, rng);
  // Lower-right wing (mirrored)
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
  const yOff = verticalOffset * 8; // Vertical split between upper/lower foils

  ctx.save();

  // Wing body — each wing at least 55px long from root to tip
  const wingGrad = ctx.createLinearGradient(-22, 0, -78, 0);
  wingGrad.addColorStop(0, '#a8acb0');
  wingGrad.addColorStop(0.3, '#989ca0');
  wingGrad.addColorStop(0.6, '#909498');
  wingGrad.addColorStop(1, '#808488');

  ctx.fillStyle = wingGrad;
  ctx.beginPath();
  ctx.moveTo(-22, -16 + yOff);    // wing root leading edge
  ctx.lineTo(-50, -24 + yOff);    // mid-wing leading edge
  ctx.lineTo(-72, -28 + yOff);    // outer leading edge
  ctx.lineTo(-76, -26 + yOff);    // wingtip leading
  ctx.lineTo(-78, -22 + yOff);    // wingtip
  ctx.lineTo(-76, -14 + yOff);    // wingtip trailing
  ctx.lineTo(-72, -12 + yOff);    // outer trailing edge
  ctx.lineTo(-50, -4 + yOff);     // mid-wing trailing
  ctx.lineTo(-22, 4 + yOff);      // wing root trailing edge
  ctx.closePath();
  ctx.fill();

  // Wing outline
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Leading edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-23, -16 + yOff);
  ctx.lineTo(-50, -24 + yOff);
  ctx.lineTo(-72, -28 + yOff);
  ctx.stroke();

  // Trailing edge shadow
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-23, 4 + yOff);
  ctx.lineTo(-50, -4 + yOff);
  ctx.lineTo(-72, -12 + yOff);
  ctx.stroke();

  // Primary red stripe marking (wide)
  ctx.fillStyle = 'rgba(180,40,30,0.7)';
  ctx.beginPath();
  ctx.moveTo(-26, -14 + yOff);
  ctx.lineTo(-65, -25 + yOff);
  ctx.lineTo(-65, -21 + yOff);
  ctx.lineTo(-26, -10 + yOff);
  ctx.closePath();
  ctx.fill();

  // Secondary thin red stripe
  ctx.fillStyle = 'rgba(180,40,30,0.5)';
  ctx.beginPath();
  ctx.moveTo(-26, -6 + yOff);
  ctx.lineTo(-60, -14 + yOff);
  ctx.lineTo(-60, -12 + yOff);
  ctx.lineTo(-26, -4 + yOff);
  ctx.closePath();
  ctx.fill();

  // 4 wing panel seams
  drawPanelLine(ctx, -26, -8 + yOff, -70, -18 + yOff, 0.2, 0.1);
  drawPanelLine(ctx, -30, -14 + yOff, -68, -24 + yOff, 0.15, 0.08);
  drawPanelLine(ctx, -40, -24 + yOff, -40, -2 + yOff, 0.12, 0.06);
  drawPanelLine(ctx, -58, -26 + yOff, -58, -10 + yOff, 0.12, 0.06);

  // 3 rivet rows per wing
  drawRivetRow(ctx, -26, -8 + yOff, -68, -18 + yOff, 10, 0.55);
  drawRivetRow(ctx, -28, -14 + yOff, -66, -24 + yOff, 8, 0.5);
  drawRivetRow(ctx, -26, -2 + yOff, -68, -12 + yOff, 10, 0.5);

  // 3 greeble blocks per wing
  drawGreebleBlock(ctx, -45, -16 + yOff, 7, 5, rng, '#808488');
  drawGreebleBlock(ctx, -56, -20 + yOff, 6, 4, rng, '#808488');
  drawGreebleBlock(ctx, -34, -10 + yOff, 6, 5, rng, '#909498');

  // Wing surface cross-hatching texture
  drawCrossHatching(ctx, -70, -26 + yOff, 46, 22, 5, 0.03);

  // Wing weathering (8 scratches per wing)
  drawWeathering(ctx, -75, -28 + yOff, 50, 28, rng, 8, 0.06);

  ctx.restore();
}

function drawLaserCannons(ctx: CanvasRenderingContext2D): void {
  // Four laser cannons at wingtips
  const positions = [
    { x: -77, y: -36 }, // upper-left
    { x: 77, y: -36 },  // upper-right
    { x: -77, y: -16 }, // lower-left
    { x: 77, y: -16 },  // lower-right
  ];

  for (const pos of positions) {
    ctx.save();

    // Cannon mounting bracket
    ctx.fillStyle = '#585c60';
    ctx.fillRect(pos.x - 3, pos.y - 2, 6, 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(pos.x - 3, pos.y - 2, 6, 5);

    // Barrel (cylindrical look)
    ctx.fillStyle = '#606468';
    ctx.fillRect(pos.x - 2, pos.y - 18, 4, 20);

    // Barrel highlight (left side)
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(pos.x - 2, pos.y - 18, 1.2, 20);

    // Barrel shadow (right side)
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(pos.x + 1, pos.y - 18, 1.2, 20);

    // Barrel rings (3 rings)
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.7;
    for (let r = 0; r < 3; r++) {
      const ringY = pos.y - 4 - r * 5;
      ctx.beginPath();
      ctx.moveTo(pos.x - 2.5, ringY);
      ctx.lineTo(pos.x + 2.5, ringY);
      ctx.stroke();
    }

    // Muzzle bore (dark circle at tip)
    ctx.fillStyle = '#303438';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y - 18, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Muzzle bore inner
    ctx.fillStyle = '#1a1e22';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y - 18, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Muzzle glow indicator
    ctx.fillStyle = 'rgba(255,60,30,0.35)';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y - 18, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Muzzle glow halo
    const muzzleGlow = ctx.createRadialGradient(pos.x, pos.y - 18, 0, pos.x, pos.y - 18, 4);
    muzzleGlow.addColorStop(0, 'rgba(255,60,30,0.15)');
    muzzleGlow.addColorStop(1, 'rgba(255,60,30,0)');
    ctx.fillStyle = muzzleGlow;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y - 18, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function drawEngines(ctx: CanvasRenderingContext2D): void {
  // Two large engine housings on either side of rear fuselage
  const engines = [
    { x: -12, y: 62 },
    { x: 12, y: 62 },
  ];

  for (const eng of engines) {
    ctx.save();

    // Engine housing body
    const housingGrad = ctx.createLinearGradient(eng.x - 8, 0, eng.x + 8, 0);
    housingGrad.addColorStop(0, '#606468');
    housingGrad.addColorStop(0.5, '#707478');
    housingGrad.addColorStop(1, '#585c60');
    ctx.fillStyle = housingGrad;
    ctx.fillRect(eng.x - 8, eng.y - 8, 16, 18);

    // Housing outline
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(eng.x - 8, eng.y - 8, 16, 18);

    // Grating lines (8 slats)
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 8; i++) {
      const gy = eng.y - 5 + i * 2.2;
      ctx.beginPath();
      ctx.moveTo(eng.x - 6, gy);
      ctx.lineTo(eng.x + 6, gy);
      ctx.stroke();
    }

    // Grating highlight between slats
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.3;
    for (let i = 0; i < 7; i++) {
      const gy = eng.y - 3.9 + i * 2.2;
      ctx.beginPath();
      ctx.moveTo(eng.x - 5, gy);
      ctx.lineTo(eng.x + 5, gy);
      ctx.stroke();
    }

    // Nozzle rim with metallic gradient
    const rimGrad = ctx.createLinearGradient(eng.x - 8, eng.y + 10, eng.x + 8, eng.y + 10);
    rimGrad.addColorStop(0, '#585c60');
    rimGrad.addColorStop(0.3, '#787c80');
    rimGrad.addColorStop(0.5, '#8a8e92');
    rimGrad.addColorStop(0.7, '#787c80');
    rimGrad.addColorStop(1, '#484c50');
    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.ellipse(eng.x, eng.y + 10, 8, 3, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Inner nozzle glow (hot amber)
    const nozzleGlow = ctx.createRadialGradient(eng.x, eng.y + 10, 0, eng.x, eng.y + 10, 6);
    nozzleGlow.addColorStop(0, 'rgba(255,180,80,0.5)');
    nozzleGlow.addColorStop(0.5, 'rgba(255,140,50,0.3)');
    nozzleGlow.addColorStop(1, 'rgba(255,100,30,0.1)');
    ctx.fillStyle = nozzleGlow;
    ctx.beginPath();
    ctx.ellipse(eng.x, eng.y + 10, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thruster flame (large — 35px long)
    drawThrusterFlame(ctx, eng.x, eng.y + 12, 12, 35);

    ctx.restore();
  }
}

function drawCockpit(ctx: CanvasRenderingContext2D): void {
  ctx.save();

  // Cockpit surround frame with beveled edge
  const frameGrad = ctx.createLinearGradient(-10, -52, 10, -32);
  frameGrad.addColorStop(0, '#686c70');
  frameGrad.addColorStop(0.5, '#585c60');
  frameGrad.addColorStop(1, '#505458');
  ctx.fillStyle = frameGrad;
  ctx.beginPath();
  ctx.ellipse(0, -42, 10, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Beveled edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, -42, 10, 14, 0, Math.PI * 0.8, Math.PI * 1.8);
  ctx.stroke();

  // Beveled edge shadow
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, -42, 10, 14, 0, -Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();

  // Canopy glass — 5 panes with gradient
  const glassGrad = ctx.createLinearGradient(0, -54, 0, -30);
  glassGrad.addColorStop(0, 'rgba(140,200,240,0.6)');
  glassGrad.addColorStop(0.3, 'rgba(100,160,200,0.55)');
  glassGrad.addColorStop(0.6, 'rgba(80,140,180,0.5)');
  glassGrad.addColorStop(0.8, 'rgba(50,100,140,0.45)');
  glassGrad.addColorStop(1, 'rgba(40,80,120,0.4)');

  ctx.fillStyle = glassGrad;
  ctx.beginPath();
  ctx.ellipse(0, -42, 8, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Canopy frame lines (thick frames dividing panes)
  ctx.strokeStyle = 'rgba(60,64,68,0.7)';
  ctx.lineWidth = 0.8;
  // Vertical frame
  ctx.beginPath();
  ctx.moveTo(0, -54);
  ctx.lineTo(0, -30);
  ctx.stroke();
  // Main horizontal frame
  ctx.beginPath();
  ctx.moveTo(-7, -42);
  ctx.lineTo(7, -42);
  ctx.stroke();
  // Upper horizontal frame
  ctx.beginPath();
  ctx.moveTo(-5, -48);
  ctx.lineTo(5, -48);
  ctx.stroke();
  // Lower horizontal frame
  ctx.beginPath();
  ctx.moveTo(-5, -36);
  ctx.lineTo(5, -36);
  ctx.stroke();
  // Diagonal frame (creating 5th pane effect)
  ctx.beginPath();
  ctx.moveTo(-3, -52);
  ctx.lineTo(3, -52);
  ctx.stroke();

  // Pilot seat headrest hint (tiny dark shape)
  ctx.fillStyle = 'rgba(30,30,30,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, -38, 2, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Canopy reflection 1 (main)
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.ellipse(-3, -47, 2.5, 4, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Canopy reflection 2 (smaller, right side)
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.ellipse(3, -40, 1.5, 2.5, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Canopy reflection 3 (bottom edge)
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.ellipse(0, -33, 3, 1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Instrument panel glow (warm amber/green at bottom of canopy)
  const instrGrad = ctx.createRadialGradient(0, -34, 0, 0, -34, 5);
  instrGrad.addColorStop(0, 'rgba(100,200,80,0.18)');
  instrGrad.addColorStop(0.5, 'rgba(180,160,60,0.08)');
  instrGrad.addColorStop(1, 'rgba(100,200,80,0)');
  ctx.fillStyle = instrGrad;
  ctx.beginPath();
  ctx.arc(0, -34, 5, 0, Math.PI * 2);
  ctx.fill();

  // Second instrument glow (amber side)
  const instrGrad2 = ctx.createRadialGradient(2, -35, 0, 2, -35, 3);
  instrGrad2.addColorStop(0, 'rgba(200,150,50,0.12)');
  instrGrad2.addColorStop(1, 'rgba(200,150,50,0)');
  ctx.fillStyle = instrGrad2;
  ctx.beginPath();
  ctx.arc(2, -35, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawAstromech(ctx: CanvasRenderingContext2D): void {
  ctx.save();

  const domeX = 0;
  const domeY = -22;
  const domeR = 6;

  // Dome body — radial gradient with colored panel segments
  const domeGrad = ctx.createRadialGradient(domeX - 1, domeY - 1.5, 0, domeX, domeY, domeR);
  domeGrad.addColorStop(0, '#e8ecf0');
  domeGrad.addColorStop(0.4, '#b0c0d0');
  domeGrad.addColorStop(0.8, '#4060a0');
  domeGrad.addColorStop(1, '#305080');

  ctx.fillStyle = domeGrad;
  ctx.beginPath();
  ctx.arc(domeX, domeY, domeR, 0, Math.PI * 2);
  ctx.fill();

  // Dome outline
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Colored panel segments (blue and silver alternating)
  ctx.fillStyle = 'rgba(40,80,160,0.25)';
  ctx.beginPath();
  ctx.moveTo(domeX, domeY);
  ctx.arc(domeX, domeY, domeR - 0.5, 0, Math.PI / 3);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(40,80,160,0.25)';
  ctx.beginPath();
  ctx.moveTo(domeX, domeY);
  ctx.arc(domeX, domeY, domeR - 0.5, Math.PI * 2 / 3, Math.PI);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(40,80,160,0.25)';
  ctx.beginPath();
  ctx.moveTo(domeX, domeY);
  ctx.arc(domeX, domeY, domeR - 0.5, Math.PI * 4 / 3, Math.PI * 5 / 3);
  ctx.closePath();
  ctx.fill();

  // Horizontal band around dome
  ctx.strokeStyle = 'rgba(80,100,140,0.4)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(domeX, domeY + 1, domeR - 0.5, domeR * 0.35, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Eye (photoreceptor) — larger
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(domeX, domeY - 1, 2, 0, Math.PI * 2);
  ctx.fill();

  // Eye ring
  ctx.strokeStyle = '#404040';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Eye lens with specular
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(domeX - 0.6, domeY - 1.6, 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Secondary eye specular
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.arc(domeX + 0.5, domeY - 0.5, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Dome ring (equator line)
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.ellipse(domeX, domeY + 2, domeR - 0.3, domeR * 0.22, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Small detail circles on dome
  ctx.fillStyle = 'rgba(60,80,120,0.3)';
  ctx.beginPath();
  ctx.arc(domeX + 3, domeY + 1, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(160,60,60,0.3)';
  ctx.beginPath();
  ctx.arc(domeX - 3, domeY + 2, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawNoseCone(ctx: CanvasRenderingContext2D): void {
  ctx.save();

  // Nose cone separate color (slightly different from main hull)
  ctx.fillStyle = 'rgba(200,210,220,0.15)';
  ctx.beginPath();
  ctx.moveTo(0, -92);
  ctx.lineTo(8, -82);
  ctx.lineTo(12, -72);
  ctx.lineTo(-12, -72);
  ctx.lineTo(-8, -82);
  ctx.closePath();
  ctx.fill();

  // Sensor array window at nose tip
  ctx.fillStyle = 'rgba(40,60,80,0.55)';
  ctx.beginPath();
  ctx.ellipse(0, -86, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sensor window frame
  ctx.strokeStyle = 'rgba(60,70,80,0.4)';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Sensor glass reflection
  ctx.fillStyle = 'rgba(120,180,220,0.35)';
  ctx.beginPath();
  ctx.ellipse(-1, -87, 2, 1.5, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Antenna nub at tip
  ctx.fillStyle = '#505458';
  ctx.beginPath();
  ctx.moveTo(-1, -92);
  ctx.lineTo(1, -92);
  ctx.lineTo(0.5, -96);
  ctx.lineTo(-0.5, -96);
  ctx.closePath();
  ctx.fill();

  // Antenna tiny glow
  const antGlow = ctx.createRadialGradient(0, -96, 0, 0, -96, 3);
  antGlow.addColorStop(0, 'rgba(100,200,255,0.2)');
  antGlow.addColorStop(1, 'rgba(100,200,255,0)');
  ctx.fillStyle = antGlow;
  ctx.beginPath();
  ctx.arc(0, -96, 3, 0, Math.PI * 2);
  ctx.fill();

  // Nose edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-4, -84);
  ctx.quadraticCurveTo(0, -96, 4, -84);
  ctx.stroke();

  ctx.restore();
}

function drawUtahDecal(ctx: CanvasRenderingContext2D): void {
  ctx.save();

  // Small rectangular patch with muted colors (Utah flag hint)
  const decalX = -18;
  const decalY = 14;
  const decalW = 10;
  const decalH = 7;

  // Dark blue background
  ctx.fillStyle = 'rgba(20,40,80,0.3)';
  ctx.fillRect(decalX, decalY, decalW, decalH);

  // Border
  ctx.strokeStyle = 'rgba(180,160,60,0.25)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(decalX, decalY, decalW, decalH);

  // Central emblem hint (small circle)
  ctx.fillStyle = 'rgba(180,160,60,0.2)';
  ctx.beginPath();
  ctx.arc(decalX + decalW / 2, decalY + decalH / 2, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawNavLights(ctx: CanvasRenderingContext2D): void {
  // Red port (left) light — larger with bigger glow
  drawNavLight(ctx, -24, 0, 2, '#ff2200', 8, 0.35);
  // Green starboard (right) light
  drawNavLight(ctx, 24, 0, 2, '#00dd44', 8, 0.35);
  // White tail light
  drawNavLight(ctx, 0, 72, 1.5, '#ffffff', 5, 0.25);
  // Secondary tail lights
  drawNavLight(ctx, -8, 74, 1, '#ff6600', 4, 0.2);
  drawNavLight(ctx, 8, 74, 1, '#ff6600', 4, 0.2);
}

function drawHullSpeculars(ctx: CanvasRenderingContext2D): void {
  // Main hull specular (upper-left light source) — large
  drawSpecularHighlight(ctx, -8, -40, 10, 22, 0.12);
  // Secondary specular on mid-hull
  drawSpecularHighlight(ctx, -4, 10, 6, 12, 0.08);
  // Small specular on lower hull
  drawSpecularHighlight(ctx, -6, 50, 5, 8, 0.06);
  // Nose cone specular
  drawSpecularHighlight(ctx, -3, -78, 4, 6, 0.10);
  // Engine housing speculars
  drawSpecularHighlight(ctx, -14, 62, 3, 5, 0.08);
  drawSpecularHighlight(ctx, 10, 62, 3, 5, 0.08);
}
