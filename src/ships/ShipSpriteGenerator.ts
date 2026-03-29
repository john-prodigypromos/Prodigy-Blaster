// ── Ship Sprite Sheet Generator ──────────────────────────
// Renders a ship draw function at 72 rotation angles (5-degree increments)
// and creates a Phaser sprite sheet texture.

import Phaser from 'phaser';

/** Total rotation frames (360 / 5 = 72) */
export const ROTATION_FRAMES = 72;
/** Degrees per frame */
export const DEGREES_PER_FRAME = 360 / ROTATION_FRAMES;

export type ShipDrawFunction = (ctx: CanvasRenderingContext2D, seed?: number) => void;

/**
 * Given a ship drawing function and a frame size, renders all 72 rotation
 * frames into a single-row sprite sheet and registers it as a Phaser texture.
 *
 * @param scene    - The Phaser scene (used to access the texture manager)
 * @param key      - The texture key to register
 * @param drawFn   - The function that draws the ship pointing UP at (0,0)
 * @param frameSize - Width/height of each frame (square, must contain full ship + padding)
 * @param seed     - RNG seed for consistent detail placement
 */
export function generateShipSpriteSheet(
  scene: Phaser.Scene,
  key: string,
  drawFn: ShipDrawFunction,
  frameSize: number,
  seed = 42,
): void {
  const sheetWidth = frameSize * ROTATION_FRAMES;
  const sheetHeight = frameSize;

  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = sheetWidth;
  canvas.height = sheetHeight;
  const ctx = canvas.getContext('2d')!;

  // Render each rotation frame
  for (let i = 0; i < ROTATION_FRAMES; i++) {
    const angle = (i * DEGREES_PER_FRAME * Math.PI) / 180;

    ctx.save();

    // Translate to the center of this frame's cell
    ctx.translate(i * frameSize + frameSize / 2, frameSize / 2);

    // Rotate (the draw function draws pointing UP, so 0 degrees = up)
    ctx.rotate(angle);

    // Draw the ship (resets seed each time for consistency)
    drawFn(ctx, seed);

    ctx.restore();
  }

  // Convert canvas to image, then add as Phaser spritesheet.
  // Phaser's addSpriteSheet expects an HTMLImageElement, so we use
  // addSpriteSheetFromAtlas after adding the canvas as a plain texture,
  // or we can use the canvas texture approach with manual frame creation.
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }

  // Add canvas as a raw texture first
  const canvasTexture = scene.textures.addCanvas(key, canvas);

  // Manually add spritesheet frames to this texture
  const texture = canvasTexture!;
  // Remove the auto-generated __BASE frame data and replace with our frames
  for (let i = 0; i < ROTATION_FRAMES; i++) {
    texture.add(i, 0, i * frameSize, 0, frameSize, frameSize);
  }
}

/**
 * Convert a rotation angle (radians) to the nearest sprite frame index (0..71).
 * Expects the game's rotation convention where 0 = right, PI/2 = down, etc.
 * The sprite sheet frame 0 = pointing UP.
 *
 * @param rotation - Rotation in radians (game convention: 0 = right)
 * @returns Frame index 0..71
 */
export function rotationToFrame(rotation: number): number {
  // The ship's `rotation` field uses: 0 = right, so we need to add PI/2
  // to convert to our sprite convention where frame 0 = up.
  // In PhysicsSystem, sprite rotation was: ship.rotation + PI/2
  // ship.rotation = -PI/2 means pointing up (right - 90 = up)
  // We want frame 0 = up, frame 18 = right, frame 36 = down, frame 54 = left

  // Convert from game rotation (0=right) to angle-from-up (0=up, clockwise positive)
  let angleDeg = ((rotation + Math.PI / 2) * 180) / Math.PI;

  // Normalize to 0..360
  angleDeg = ((angleDeg % 360) + 360) % 360;

  // Map to frame index
  const frame = Math.round(angleDeg / DEGREES_PER_FRAME) % ROTATION_FRAMES;
  return frame;
}
