/**
 * generate-icons.js
 * Generates 5StarX branded app icons and splash screen.
 * Run with: node scripts/generate-icons.js
 *
 * To replace with a real logo later, just swap out the PNG files in /assets/
 * and delete this script — app.json already points to the right paths.
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const CHARCOAL   = '#2C2C2E';
const GOLD       = '#C9A84C';
const GOLD_LIGHT = '#E0C97A';
const WHITE      = '#FFFFFF';

const ASSETS = path.join(__dirname, '../assets');

// ─── Draw the star burst icon ─────────────────────────────────────────────────
// Matches the 5StarX logo: 4-point star with smaller sparkle dots
function drawStar(ctx, cx, cy, size) {
  const outer = size * 0.48;
  const inner = size * 0.18;
  const points = 4;

  // Main 4-point star (sharp, like a compass rose)
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = GOLD;
  ctx.fill();

  // Sparkle dots around the star
  const dotPositions = [
    { angle: -Math.PI / 4,      dist: size * 0.56, r: size * 0.045 },  // top-right
    { angle:  Math.PI * 0.85,   dist: size * 0.50, r: size * 0.035 },  // bottom-left
    { angle: -Math.PI * 0.15,   dist: size * 0.62, r: size * 0.028 },  // right
    { angle:  Math.PI * 0.55,   dist: size * 0.48, r: size * 0.022 },  // bottom
  ];

  dotPositions.forEach(({ angle, dist, r }) => {
    ctx.beginPath();
    ctx.arc(cx + dist * Math.cos(angle), cy + dist * Math.sin(angle), r, 0, Math.PI * 2);
    ctx.fillStyle = GOLD_LIGHT;
    ctx.fill();
  });

  // Small arc / crescent underneath-left (matches logo detail)
  ctx.beginPath();
  ctx.arc(cx - size * 0.28, cy + size * 0.22, size * 0.22, Math.PI * 0.55, Math.PI * 1.55);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = size * 0.045;
  ctx.stroke();
}

// ─── Draw full wordmark (star + "5StarX" text) ────────────────────────────────
function drawWordmark(ctx, cx, cy, starSize, textSize, gap) {
  // Measure text first
  ctx.font = `bold ${textSize}px sans-serif`;
  const textWidth = ctx.measureText('5StarX').width;
  const totalWidth = starSize + gap + textWidth;
  const startX = cx - totalWidth / 2;

  // Star
  drawStar(ctx, startX + starSize / 2, cy, starSize);

  // Text
  ctx.fillStyle = GOLD;
  ctx.font = `bold ${textSize}px sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText('5StarX', startX + starSize + gap, cy);
}

// ─── Rounded rectangle helper ────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Save canvas to PNG ───────────────────────────────────────────────────────
function save(canvas, filename) {
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(ASSETS, filename), buffer);
  console.log(`  ✓ ${filename} (${canvas.width}×${canvas.height})`);
}

// ─── 1. App Icon — 1024×1024 ──────────────────────────────────────────────────
// Square, no rounded corners (iOS/Android apply their own masks)
function generateIcon() {
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = CHARCOAL;
  ctx.fillRect(0, 0, size, size);

  // Just the star mark centred — cleaner for small icon sizes
  drawStar(ctx, size / 2, size / 2, size * 0.52);

  save(canvas, 'icon.png');
}

// ─── 2. Adaptive Icon — 1024×1024 (Android foreground, bg set in app.json) ───
function generateAdaptiveIcon() {
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Transparent background — Android composites over the charcoal bg from app.json
  ctx.clearRect(0, 0, size, size);
  drawStar(ctx, size / 2, size / 2, size * 0.48);

  save(canvas, 'adaptive-icon.png');
}

// ─── 3. Splash Icon — 800×300 (shown centred on charcoal bg from app.json) ───
function generateSplashIcon() {
  const w = 800;
  const h = 300;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Transparent — splash background is charcoal from app.json
  ctx.clearRect(0, 0, w, h);

  const starSize = h * 0.46;
  const textSize = h * 0.30;
  drawWordmark(ctx, w / 2, h / 2, starSize, textSize, h * 0.05);

  save(canvas, 'splash-icon.png');
}

// ─── 4. Favicon — 48×48 ──────────────────────────────────────────────────────
function generateFavicon() {
  const size = 48;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = CHARCOAL;
  ctx.fillRect(0, 0, size, size);
  drawStar(ctx, size / 2, size / 2, size * 0.46);

  save(canvas, 'favicon.png');
}

// ─── 5. Logo (for use inside the app — e.g. login screen) ────────────────────
function generateLogo() {
  const w = 360;
  const h = 100;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Rounded rect background
  ctx.fillStyle = CHARCOAL;
  roundRect(ctx, 0, 0, w, h, 18);
  ctx.fill();

  const starSize = h * 0.55;
  const textSize = h * 0.38;
  drawWordmark(ctx, w / 2, h / 2, starSize, textSize, h * 0.07);

  save(canvas, 'logo.png');
}

// ─── Run ──────────────────────────────────────────────────────────────────────
console.log('\nGenerating 5StarX assets...');
generateIcon();
generateAdaptiveIcon();
generateSplashIcon();
generateFavicon();
generateLogo();
console.log('\nDone. Replace any file in /assets/ with the real logo PNG when ready.\n');
