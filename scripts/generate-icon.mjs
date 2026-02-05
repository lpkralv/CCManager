#!/usr/bin/env node

/**
 * Icon Generator for CCManager
 *
 * Generates a macOS .icns icon file with a Claude-inspired design:
 * - Rounded diamond (45-degree rotated rounded square) background
 * - Claude-like sparkle/asterisk motif in the center
 *
 * Uses sharp for PNG generation and iconutil for .icns packaging.
 */

import sharp from 'sharp';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ICONSET_DIR = join(ROOT, 'build', 'icon.iconset');
const ICNS_PATH = join(ROOT, 'build', 'icon.icns');

// Design constants
const BG_COLOR = '#D97757';       // Warm coral/terracotta (Claude brand)
const SPARKLE_COLOR = '#FFFFFF';  // White sparkle
const CANVAS_BG = 'transparent';  // Transparent canvas background

// macOS iconset required sizes
// Format: [filename, pixel dimensions]
const ICON_SIZES = [
  ['icon_16x16.png',      16],
  ['icon_16x16@2x.png',   32],
  ['icon_32x32.png',      32],
  ['icon_32x32@2x.png',   64],
  ['icon_128x128.png',    128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png',    256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png',    512],
  ['icon_512x512@2x.png', 1024],
];

/**
 * Generate an SVG of the icon at a given size.
 * The design is a rounded diamond with a Claude-style sparkle inside.
 */
function generateIconSVG(size) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;

  // Diamond dimensions - the diamond fits within the canvas with padding
  const padding = s * 0.04;
  const diamondRadius = (s / 2) - padding;  // Distance from center to vertex
  const cornerRadius = diamondRadius * 0.18; // Rounded corners

  // Build the rounded diamond path using a rotated rounded-rect approach.
  // A rounded diamond is a square rotated 45 degrees with rounded corners.
  // We define it as a path with arcs at the corners.

  // The four vertices of the diamond (top, right, bottom, left)
  const top    = { x: cx,               y: cy - diamondRadius };
  const right  = { x: cx + diamondRadius, y: cy };
  const bottom = { x: cx,               y: cy + diamondRadius };
  const left   = { x: cx - diamondRadius, y: cy };

  // For rounded corners, we pull back from each vertex along each edge
  // by the corner radius amount, then use a quadratic bezier for the curve.
  const cr = cornerRadius;

  // Helper: point along the line from p1 to p2, at distance d from p1
  function pointAlong(p1, p2, d) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ratio = d / len;
    return { x: p1.x + dx * ratio, y: p1.y + dy * ratio };
  }

  // For each vertex, compute the two points where the rounding begins/ends
  const tR = pointAlong(top, right, cr);    // top toward right
  const rT = pointAlong(right, top, cr);    // right toward top
  const rB = pointAlong(right, bottom, cr); // right toward bottom
  const bR = pointAlong(bottom, right, cr); // bottom toward right
  const bL = pointAlong(bottom, left, cr);  // bottom toward left
  const lB = pointAlong(left, bottom, cr);  // left toward bottom
  const lT = pointAlong(left, top, cr);     // left toward top
  const tL = pointAlong(top, left, cr);     // top toward left

  // Build path: start from tR, line to rT, curve through right vertex, etc.
  const diamondPath = [
    `M ${tR.x} ${tR.y}`,
    `L ${rT.x} ${rT.y}`,
    `Q ${right.x} ${right.y} ${rB.x} ${rB.y}`,
    `L ${bR.x} ${bR.y}`,
    `Q ${bottom.x} ${bottom.y} ${bL.x} ${bL.y}`,
    `L ${lB.x} ${lB.y}`,
    `Q ${left.x} ${left.y} ${lT.x} ${lT.y}`,
    `L ${tL.x} ${tL.y}`,
    `Q ${top.x} ${top.y} ${tR.x} ${tR.y}`,
    'Z'
  ].join(' ');

  // Sparkle / asterisk design
  // Claude's sparkle is a soft, organic asterisk with smoothly tapered arms
  // We use 8 arms with cubic bezier curves for a smooth, rounded taper
  const sparkleArms = 8;
  const sparkleOuterRadius = diamondRadius * 0.44;  // How far arms extend from center
  const sparkleBaseOffset = diamondRadius * 0.13;    // Where arms begin (from center)
  const armWidthBase = diamondRadius * 0.10;         // Arm half-width at base

  // Build the sparkle as a series of smoothly tapered arm shapes using cubic beziers
  let sparklePaths = '';
  for (let i = 0; i < sparkleArms; i++) {
    const angle = (i * Math.PI * 2) / sparkleArms - Math.PI / 2; // Start from top

    // Direction vectors
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const perpX = Math.cos(angle + Math.PI / 2);
    const perpY = Math.sin(angle + Math.PI / 2);

    // Arm tip point (rounded end)
    const tipX = cx + dirX * sparkleOuterRadius;
    const tipY = cy + dirY * sparkleOuterRadius;

    // Base points (where arm meets center area)
    const bx = cx + dirX * sparkleBaseOffset;
    const by = cy + dirY * sparkleBaseOffset;
    const baseLeftX = bx + perpX * armWidthBase;
    const baseLeftY = by + perpY * armWidthBase;
    const baseRightX = bx - perpX * armWidthBase;
    const baseRightY = by - perpY * armWidthBase;

    // Control points for cubic bezier - create a smooth, concave taper
    // Left side control points
    const ctrl1Dist = sparkleOuterRadius * 0.55;
    const ctrl1Width = armWidthBase * 0.25;
    const ctrlL1X = cx + dirX * ctrl1Dist + perpX * ctrl1Width;
    const ctrlL1Y = cy + dirY * ctrl1Dist + perpY * ctrl1Width;

    // Right side control points (mirror)
    const ctrlR1X = cx + dirX * ctrl1Dist - perpX * ctrl1Width;
    const ctrlR1Y = cy + dirY * ctrl1Dist - perpY * ctrl1Width;

    // Tip control points for rounded end
    const tipCtrlDist = sparkleOuterRadius * 0.92;
    const tipCtrlWidth = armWidthBase * 0.04;
    const tipCtrlLX = cx + dirX * tipCtrlDist + perpX * tipCtrlWidth;
    const tipCtrlLY = cy + dirY * tipCtrlDist + perpY * tipCtrlWidth;
    const tipCtrlRX = cx + dirX * tipCtrlDist - perpX * tipCtrlWidth;
    const tipCtrlRY = cy + dirY * tipCtrlDist - perpY * tipCtrlWidth;

    // Each arm: base-left -> curve to tip -> curve back to base-right
    sparklePaths += `
      <path d="M ${baseLeftX} ${baseLeftY}
               C ${ctrlL1X} ${ctrlL1Y} ${tipCtrlLX} ${tipCtrlLY} ${tipX} ${tipY}
               C ${tipCtrlRX} ${tipCtrlRY} ${ctrlR1X} ${ctrlR1Y} ${baseRightX} ${baseRightY}
               Z"
            fill="${SPARKLE_COLOR}" />
    `;
  }

  // Center circle to blend the arms together smoothly
  const centerDotRadius = sparkleBaseOffset * 1.15;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}">
  <!-- Transparent background -->
  <rect width="${s}" height="${s}" fill="${CANVAS_BG}" />

  <!-- Subtle drop shadow for the diamond -->
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="${s * 0.005}" stdDeviation="${s * 0.015}" flood-color="#00000040" />
    </filter>
  </defs>

  <!-- Rounded diamond background -->
  <path d="${diamondPath}" fill="${BG_COLOR}" filter="url(#shadow)" />

  <!-- Sparkle arms -->
  <g>
    ${sparklePaths}
  </g>

  <!-- Center dot to unify the sparkle arms -->
  <circle cx="${cx}" cy="${cy}" r="${centerDotRadius}" fill="${SPARKLE_COLOR}" />
</svg>`;

  return svg;
}

async function generateIcon(name, pixels) {
  const svg = generateIconSVG(pixels);
  const outputPath = join(ICONSET_DIR, name);

  await sharp(Buffer.from(svg))
    .resize(pixels, pixels)
    .png()
    .toFile(outputPath);

  console.log(`  Generated ${name} (${pixels}x${pixels})`);
}

async function main() {
  console.log('CCManager Icon Generator');
  console.log('========================');
  console.log();

  // Create build/icon.iconset directory
  if (existsSync(ICONSET_DIR)) {
    rmSync(ICONSET_DIR, { recursive: true });
  }
  mkdirSync(ICONSET_DIR, { recursive: true });
  console.log('Created iconset directory:', ICONSET_DIR);
  console.log();

  // Generate all sizes
  console.log('Generating icon PNGs...');
  for (const [name, pixels] of ICON_SIZES) {
    await generateIcon(name, pixels);
  }
  console.log();

  // Run iconutil to create .icns
  console.log('Creating .icns file...');
  try {
    execSync(`/usr/bin/iconutil --convert icns --output "${ICNS_PATH}" "${ICONSET_DIR}"`, {
      stdio: 'pipe',
    });
    console.log(`  Created: ${ICNS_PATH}`);
  } catch (err) {
    console.error('Error running iconutil:', err.stderr?.toString() || err.message);
    process.exit(1);
  }

  console.log();
  console.log('Icon generation complete!');
}

main().catch((err) => {
  console.error('Failed to generate icon:', err);
  process.exit(1);
});
