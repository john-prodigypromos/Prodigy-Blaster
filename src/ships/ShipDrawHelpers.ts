// ── Ship Drawing Helpers ─────────────────────────────────
// Shared utilities for high-detail canvas ship rendering.
// All coordinates assume ship is drawn pointing UP (negative Y).

/** Seeded PRNG (mulberry32) for consistent detail placement across frames */
export class SeededRNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed;
  }
  /** Returns 0..1 */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Returns min..max (inclusive float) */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  /** Returns integer in [min, max) */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max));
  }
}

/**
 * Draw a panel seam line with highlight above and shadow below.
 * Gives the illusion of a recessed seam in the hull.
 */
export function drawPanelLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  shadowAlpha = 0.25,
  highlightAlpha = 0.12,
): void {
  // Shadow line (dark, below/right)
  ctx.save();
  ctx.strokeStyle = `rgba(0,0,0,${shadowAlpha})`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Compute offset perpendicular (1px toward light source — top-left)
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  // Highlight line
  ctx.strokeStyle = `rgba(255,255,255,${highlightAlpha})`;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x1 + nx, y1 + ny);
  ctx.lineTo(x2 + nx, y2 + ny);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw a row of rivets along a line.
 * Each rivet: shadow circle + body circle + specular dot.
 */
export function drawRivetRow(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  count: number,
  rivetRadius = 0.8,
  bodyColor = '#8a9098',
  shadowAlpha = 0.3,
  specAlpha = 0.5,
): void {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const cx = x1 + (x2 - x1) * t;
    const cy = y1 + (y2 - y1) * t;

    // Shadow (offset bottom-right)
    ctx.beginPath();
    ctx.arc(cx + 0.4, cy + 0.4, rivetRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.arc(cx, cy, rivetRadius, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor;
    ctx.fill();

    // Specular highlight (top-left)
    ctx.beginPath();
    ctx.arc(cx - 0.3, cy - 0.3, rivetRadius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${specAlpha})`;
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draw a greeble block — a recessed panel with randomized raised sub-components.
 * These are the little mechanical-looking rectangles on starship hulls.
 */
export function drawGreebleBlock(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  width: number, height: number,
  rng: SeededRNG,
  baseColor = '#6a7078',
): void {
  ctx.save();

  // Recessed panel background
  ctx.fillStyle = darkenColor(baseColor, 0.15);
  ctx.fillRect(x, y, width, height);

  // Panel border (inset shadow)
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

  // Inner highlight (top-left edges)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(x + 1, y + height - 1);
  ctx.lineTo(x + 1, y + 1);
  ctx.lineTo(x + width - 1, y + 1);
  ctx.stroke();

  // Randomized sub-components
  const subCount = rng.int(2, 5);
  for (let i = 0; i < subCount; i++) {
    const sx = x + rng.range(1, width - 4);
    const sy = y + rng.range(1, height - 3);
    const sw = rng.range(2, Math.min(6, width - (sx - x) - 1));
    const sh = rng.range(1.5, Math.min(4, height - (sy - y) - 1));

    // Raised element
    ctx.fillStyle = lightenColor(baseColor, rng.range(0.02, 0.1));
    ctx.fillRect(sx, sy, sw, sh);

    // Tiny shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(sx + sw, sy + 0.5, 0.5, sh);
    ctx.fillRect(sx, sy + sh, sw, 0.5);
  }

  ctx.restore();
}

/**
 * Draw a scorch mark — radial gradient from dark center to transparent edge.
 */
export function drawScorchMark(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  radius: number,
  alpha = 0.15,
): void {
  ctx.save();
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, `rgba(30,20,10,${alpha})`);
  grad.addColorStop(0.4, `rgba(40,30,15,${alpha * 0.7})`);
  grad.addColorStop(1, 'rgba(40,30,15,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draw micro-scratches (weathering) in a region.
 */
export function drawWeathering(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  width: number, height: number,
  rng: SeededRNG,
  count = 8,
  alpha = 0.1,
): void {
  ctx.save();
  ctx.lineWidth = 0.4;
  for (let i = 0; i < count; i++) {
    const sx = x + rng.range(0, width);
    const sy = y + rng.range(0, height);
    const length = rng.range(2, 8);
    const angle = rng.range(0, Math.PI);
    const ex = sx + Math.cos(angle) * length;
    const ey = sy + Math.sin(angle) * length;

    // Dark scratch
    ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // Adjacent highlight scratch
    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.6})`;
    ctx.beginPath();
    ctx.moveTo(sx + 0.5, sy + 0.5);
    ctx.lineTo(ex + 0.5, ey + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draw a specular highlight (elliptical bright spot).
 */
export function drawSpecularHighlight(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  radiusX: number,
  radiusY: number,
  alpha = 0.25,
): void {
  ctx.save();
  const grad = ctx.createRadialGradient(x, y, 0, x, y, Math.max(radiusX, radiusY));
  grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draw an engine thruster flame — gradient cone from hot white core to transparent.
 */
export function drawThrusterFlame(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  width: number, length: number,
  coreColor = '#ffffff',
  midColor = '#ffaa44',
  outerColor = '#ff6622',
): void {
  ctx.save();
  // Flame body (elongated triangle)
  const grad = ctx.createLinearGradient(x, y, x, y + length);
  grad.addColorStop(0, coreColor);
  grad.addColorStop(0.15, midColor);
  grad.addColorStop(0.5, outerColor);
  grad.addColorStop(1, 'rgba(255,80,20,0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x - width / 2, y);
  ctx.lineTo(x, y + length);
  ctx.lineTo(x + width / 2, y);
  ctx.closePath();
  ctx.fill();

  // Hot white inner core (narrower)
  const coreGrad = ctx.createLinearGradient(x, y, x, y + length * 0.4);
  coreGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
  coreGrad.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.moveTo(x - width * 0.2, y);
  ctx.lineTo(x, y + length * 0.4);
  ctx.lineTo(x + width * 0.2, y);
  ctx.closePath();
  ctx.fill();

  // Glow halo around nozzle
  const haloGrad = ctx.createRadialGradient(x, y, 0, x, y, width * 0.8);
  haloGrad.addColorStop(0, 'rgba(255,180,80,0.3)');
  haloGrad.addColorStop(1, 'rgba(255,100,40,0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(x, y, width * 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draw a navigation light with glow halo.
 */
export function drawNavLight(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  radius: number,
  color: string,
  glowRadius = 4,
  glowAlpha = 0.35,
): void {
  ctx.save();
  // Glow halo
  const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
  glow.addColorStop(0, colorWithAlpha(color, glowAlpha));
  glow.addColorStop(1, colorWithAlpha(color, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  // Light body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Bright center
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ── Color utility helpers ────────────────────────────────

/** Parse hex color to RGB */
function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/** Darken a hex color by a factor (0..1) */
export function darkenColor(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  const f = 1 - amount;
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}

/** Lighten a hex color by a factor (0..1) */
export function lightenColor(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * amount))},${Math.min(255, Math.round(g + (255 - g) * amount))},${Math.min(255, Math.round(b + (255 - b) * amount))})`;
}

/** Add alpha to a CSS color string */
function colorWithAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const [r, g, b] = parseHex(color);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  // If already rgb/rgba, crude replace
  return color.replace(/[\d.]+\)$/, `${alpha})`);
}
