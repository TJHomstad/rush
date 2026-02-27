// Glaze Rush — Canvas Renderer
// Glass pipes, sprinkle flow, donut characters with faces.

import {
  GAME_BG, SPRINKLE_COLORS,
  DONUT_BASE, DONUT_BASE_SHADOW,
  HAPPY_FROSTING, SAD_DONUT_BASE, SAD_DONUT_SHADOW, SAD_FROSTING,
  PIPE_OUTLINE,
  GLASS_TINT, GLASS_OUTLINE, GLASS_HIGHLIGHT, GLASS_SHADOW, GLASS_FLOW_FILL,
  FACE_OUTLINE, EYE_WHITE, PUPIL_COLOR, TONGUE_COLOR, BLUSH_COLOR, MOUTH_COLOR, SAD_EYE,
  DIR_OFFSET
} from './constants.js';
import { getActiveConnections } from './game.js';
import { coordKey } from './utils.js';

// ─── Renderer Creation ───────────────────────────────────────

export function createRenderer(canvas, model) {
  const ctx = canvas.getContext('2d');
  const state = {
    canvas,
    ctx,
    cellSize: 0,
    offsetX: 0,
    offsetY: 0,
    dpr: window.devicePixelRatio || 1,
    particles: [],
    animatingTile: null,
    winTime: null
  };

  resize(state, model);
  return state;
}

// ─── Resize ──────────────────────────────────────────────────

export function resize(state, model) {
  const { canvas, dpr } = state;
  const container = canvas.parentElement;
  if (!container) return;

  const maxWidth = Math.min(container.clientWidth, 600);
  const maxHeight = window.innerHeight - 200;

  const cellW = Math.floor(maxWidth / model.width);
  const cellH = Math.floor(maxHeight / model.height);
  let cellSize = Math.min(cellW, cellH);
  cellSize = Math.max(32, cellSize);

  const displayWidth = cellSize * model.width;
  const displayHeight = cellSize * model.height;

  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';
  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;

  state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.cellSize = cellSize;
  state.offsetX = 0;
  state.offsetY = 0;
}

// ─── Full Render ─────────────────────────────────────────────

export function render(state, model) {
  const { ctx, cellSize } = state;
  const { width, height } = model;
  const totalW = cellSize * width;
  const totalH = cellSize * height;

  // 1. Background
  ctx.fillStyle = GAME_BG;
  ctx.fillRect(0, 0, totalW, totalH);

  // 2. Subtle alternating cell shading
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if ((r + c) % 2 === 1) {
        ctx.fillStyle = 'rgba(210, 195, 170, 0.08)';
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }
  }

  // 3. Grid lines
  ctx.strokeStyle = 'rgba(200, 185, 165, 0.4)';
  ctx.lineWidth = 0.5;
  for (let r = 0; r <= height; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cellSize);
    ctx.lineTo(totalW, r * cellSize);
    ctx.stroke();
  }
  for (let c = 0; c <= width; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellSize, 0);
    ctx.lineTo(c * cellSize, totalH);
    ctx.stroke();
  }

  // 4. Win celebration state
  const winElapsed = state.winTime ? (performance.now() - state.winTime) / 1000 : -1;
  const inWinCelebration = winElapsed >= 0 && winElapsed < 2.5;

  // 5. Tiles (pipes, donuts, source)
  for (const [key, tile] of model.tiles) {
    const x = tile.col * cellSize;
    const y = tile.row * cellSize;
    const inFlow = model.flowState.has(key);

    drawTile(ctx, tile, x, y, cellSize, inFlow, inWinCelebration, winElapsed);

    // Lock indicator
    if (model.lockedTiles.has(key)) {
      drawLockIndicator(ctx, x, y, cellSize);
    }
  }

  // 6. Sprinkle particles
  drawParticles(state, model);
}

// ─── Glass Pipe Tile ─────────────────────────────────────────

function drawTile(ctx, tile, x, y, cellSize, inFlow, inWinCelebration, winElapsed) {
  const cx = x + cellSize / 2;
  const cy = y + cellSize / 2;
  const active = getActiveConnections(tile);
  const pipeWidth = cellSize * 0.24;
  const outerWidth = pipeWidth + 2;
  const highlightWidth = pipeWidth * 0.18;
  const shadowWidth = pipeWidth * 0.15;

  // Win celebration glow
  if (inWinCelebration && inFlow) {
    const pulse = 0.3 + 0.3 * Math.sin(winElapsed * 6);
    ctx.save();
    ctx.shadowColor = '#FF1493';
    ctx.shadowBlur = cellSize * 0.35 * pulse;
    ctx.strokeStyle = 'rgba(255, 20, 147, 0.25)';
    ctx.lineWidth = outerWidth + 6;
    ctx.lineCap = 'round';
    for (const dir of active) {
      const [dr, dc] = DIR_OFFSET[dir];
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + dc * (cellSize / 2), cy + dr * (cellSize / 2));
      ctx.stroke();
    }
    ctx.restore();
  }

  // Layer 1: Outer outline (subtle dark blue-gray)
  ctx.strokeStyle = GLASS_OUTLINE;
  ctx.lineWidth = outerWidth;
  ctx.lineCap = 'round';
  for (const dir of active) {
    const [dr, dc] = DIR_OFFSET[dir];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dc * (cellSize / 2), cy + dr * (cellSize / 2));
    ctx.stroke();
  }

  // Layer 2: Glass body fill (semi-transparent blue or pink)
  ctx.strokeStyle = inFlow ? GLASS_FLOW_FILL : GLASS_TINT;
  ctx.lineWidth = pipeWidth;
  ctx.lineCap = 'round';
  for (const dir of active) {
    const [dr, dc] = DIR_OFFSET[dir];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dc * (cellSize / 2), cy + dr * (cellSize / 2));
    ctx.stroke();
  }

  // Layer 3: Bottom shadow stripe (inner edge, opposite side of highlight)
  const sOff = pipeWidth * 0.28;
  ctx.strokeStyle = inFlow ? 'rgba(120, 0, 60, 0.2)' : GLASS_SHADOW;
  ctx.lineWidth = shadowWidth;
  ctx.lineCap = 'round';
  for (const dir of active) {
    const [dr, dc] = DIR_OFFSET[dir];
    const ex = cx + dc * (cellSize / 2);
    const ey = cy + dr * (cellSize / 2);
    // Shadow offset: bottom-right (opposite of top-left highlight)
    let ox, oy;
    if (dc === 0) { ox = sOff; oy = 0; }
    else { ox = 0; oy = sOff; }
    ctx.beginPath();
    ctx.moveTo(cx + ox, cy + oy);
    ctx.lineTo(ex + ox, ey + oy);
    ctx.stroke();
  }

  // Layer 4: Top highlight stripe (white, bright — glass surface reflection)
  const hlOff = pipeWidth * 0.28;
  ctx.strokeStyle = GLASS_HIGHLIGHT;
  ctx.lineWidth = highlightWidth;
  ctx.lineCap = 'round';
  for (const dir of active) {
    const [dr, dc] = DIR_OFFSET[dir];
    const ex = cx + dc * (cellSize / 2);
    const ey = cy + dr * (cellSize / 2);
    let ox, oy;
    if (dc === 0) { ox = -hlOff; oy = 0; }
    else { ox = 0; oy = -hlOff; }
    ctx.beginPath();
    ctx.moveTo(cx + ox, cy + oy);
    ctx.lineTo(ex + ox, ey + oy);
    ctx.stroke();
  }

  // Layer 5: Junction node — glass sphere with radial gradient
  if (active.length > 0) {
    const junctionR = pipeWidth * 0.58;
    const grad = ctx.createRadialGradient(
      cx - junctionR * 0.35, cy - junctionR * 0.35, junctionR * 0.05,
      cx, cy, junctionR
    );
    if (inFlow) {
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      grad.addColorStop(0.3, 'rgba(255, 80, 160, 0.7)');
      grad.addColorStop(0.7, 'rgba(255, 20, 147, 0.6)');
      grad.addColorStop(1, 'rgba(150, 10, 80, 0.4)');
    } else {
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      grad.addColorStop(0.3, 'rgba(200, 220, 245, 0.5)');
      grad.addColorStop(0.7, 'rgba(160, 190, 220, 0.35)');
      grad.addColorStop(1, 'rgba(80, 110, 140, 0.3)');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, junctionR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw terminal (donut) or source
  if (tile.isTerminal) {
    drawDonut(ctx, cx, cy, cellSize, tile.donutStyle, inFlow, inWinCelebration, winElapsed);
  } else if (tile.isSource) {
    drawSource(ctx, cx, cy, cellSize, inFlow, inWinCelebration, winElapsed);
  }
}

// ─── Draw Donut (dispatcher) ─────────────────────────────────

function drawDonut(ctx, cx, cy, cellSize, style, inFlow, inWinCelebration, winElapsed) {
  const outerR = cellSize * 0.34;
  const ringWidth = cellSize * 0.14;
  const innerR = outerR - ringWidth;

  if (inFlow) {
    drawHappyDonut(ctx, cx, cy, cellSize, style, outerR, ringWidth, innerR, inWinCelebration, winElapsed);
  } else {
    drawSadDonut(ctx, cx, cy, cellSize, style, outerR, ringWidth, innerR);
  }
}

// ─── Donut Body (shared ring drawing) ────────────────────────

function drawDonutBody(ctx, outerR, ringWidth, innerR, bodyGrad, outlineColor, frostColor, frostHighlight, frostStart, frostEnd, style, cellSize) {
  // Body ring
  ctx.strokeStyle = bodyGrad;
  ctx.lineWidth = ringWidth;
  ctx.beginPath();
  ctx.arc(0, 0, outerR - ringWidth / 2, 0, Math.PI * 2);
  ctx.stroke();

  // Cartoon outline (thick for character look)
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = Math.max(1.5, cellSize * 0.02);
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.stroke();

  // Frosting overlay
  ctx.strokeStyle = frostColor;
  ctx.lineWidth = ringWidth * 0.75;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.arc(0, 0, outerR - ringWidth / 2, frostStart, frostEnd);
  ctx.stroke();

  // Frosting highlight
  if (frostHighlight) {
    ctx.strokeStyle = frostHighlight;
    ctx.lineWidth = ringWidth * 0.25;
    ctx.beginPath();
    ctx.arc(0, 0, outerR - ringWidth * 0.35, frostStart + 0.3, frostStart + (frostEnd - frostStart) * 0.55);
    ctx.stroke();
  }

  // Style-specific frosting details
  drawFrostingDetails(ctx, style, outerR, ringWidth, innerR, frostStart, frostEnd, cellSize);

  // Donut hole
  const holeGrad = ctx.createRadialGradient(0, 0, innerR * 0.3, 0, 0, innerR);
  holeGrad.addColorStop(0, 'rgba(60, 40, 20, 0.35)');
  holeGrad.addColorStop(0.7, 'rgba(60, 40, 20, 0.1)');
  holeGrad.addColorStop(1, 'rgba(139, 105, 20, 0.25)');
  ctx.fillStyle = holeGrad;
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.fill();
}

function drawFrostingDetails(ctx, style, outerR, ringWidth, innerR, frostStart, frostEnd, cellSize) {
  if (style === 'pink_sprinkle') {
    const midR = outerR - ringWidth / 2;
    for (let i = 0; i < 10; i++) {
      const angle = frostStart + (frostEnd - frostStart) * (i + 0.5) / 10;
      const sr = midR + (Math.sin(i * 7.3) * ringWidth * 0.2);
      const sx = Math.cos(angle) * sr;
      const sy = Math.sin(angle) * sr;
      const rot = (i * 47) % 360 * Math.PI / 180;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(rot);
      ctx.fillStyle = SPRINKLE_COLORS[i % SPRINKLE_COLORS.length];
      ctx.fillRect(-cellSize * 0.025, -cellSize * 0.008, cellSize * 0.05, cellSize * 0.016);
      ctx.restore();
    }
  } else if (style === 'boston_cream') {
    const frosting = HAPPY_FROSTING.boston_cream;
    if (frosting && frosting.cap) {
      ctx.strokeStyle = frosting.cap;
      ctx.lineWidth = ringWidth * 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, outerR - ringWidth / 2, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
    }
  } else if (style === 'powdered') {
    ctx.strokeStyle = 'rgba(123, 237, 159, 0.45)';
    ctx.lineWidth = ringWidth * 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, outerR - ringWidth / 2, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 / 14) * i;
      const sr = outerR - ringWidth / 2 + (Math.sin(i * 5.1) * ringWidth * 0.15);
      ctx.fillStyle = 'rgba(168, 245, 192, 0.8)';
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * sr, Math.sin(angle) * sr, cellSize * 0.012, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style === 'maple') {
    ctx.strokeStyle = '#7C75D4';
    ctx.lineWidth = ringWidth * 0.12;
    for (let i = 0; i < 3; i++) {
      const a1 = frostStart + (frostEnd - frostStart) * (0.2 + i * 0.25);
      ctx.beginPath();
      ctx.arc(0, 0, outerR - ringWidth * (0.35 + i * 0.1), a1, a1 + 0.3);
      ctx.stroke();
    }
  }
}

// ─── Sad Donut (unfilled — gray, droopy, sad face) ───────────

function drawSadDonut(ctx, cx, cy, cellSize, style, outerR, ringWidth, innerR) {
  const scale = 0.92;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Gray body gradient
  const bodyGrad = ctx.createRadialGradient(
    -outerR * 0.2, -outerR * 0.2, innerR * 0.5,
    0, 0, outerR * 1.1
  );
  bodyGrad.addColorStop(0, '#B8B8B8');
  bodyGrad.addColorStop(0.5, SAD_DONUT_BASE);
  bodyGrad.addColorStop(1, SAD_DONUT_SHADOW);

  // Droopy frosting (sags to bottom)
  const droopStart = -Math.PI * 0.15;
  const droopEnd = Math.PI * 1.15;

  drawDonutBody(ctx, outerR, ringWidth, innerR, bodyGrad, '#686868', SAD_FROSTING, null, droopStart, droopEnd, null, cellSize);

  // Draw sad face on the frosting area (upper portion of donut ring)
  drawSadFace(ctx, cellSize, outerR, ringWidth);

  ctx.restore();
}

// ─── Happy Donut (filled — vibrant, derpy face) ──────────────

function drawHappyDonut(ctx, cx, cy, cellSize, style, outerR, ringWidth, innerR, inWinCelebration, winElapsed) {
  const frosting = HAPPY_FROSTING[style] || HAPPY_FROSTING.glazed;

  let scale = 1.0 + 0.02 * Math.sin(performance.now() / 300);
  if (inWinCelebration) {
    scale = 1.0 + 0.08 * Math.sin(winElapsed * 8);
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Glow
  const glowPulse = inWinCelebration
    ? 0.6 + 0.3 * Math.sin(winElapsed * 6)
    : 0.4 + 0.15 * Math.sin(performance.now() / 400);
  ctx.shadowColor = '#FF1493';
  ctx.shadowBlur = cellSize * 0.25 * glowPulse;

  // Warm golden body
  const bodyGrad = ctx.createRadialGradient(
    -outerR * 0.2, -outerR * 0.2, innerR * 0.5,
    0, 0, outerR * 1.1
  );
  bodyGrad.addColorStop(0, '#F0D080');
  bodyGrad.addColorStop(0.5, DONUT_BASE);
  bodyGrad.addColorStop(1, DONUT_BASE_SHADOW);

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  const frostStart = -Math.PI * 0.85;
  const frostEnd = Math.PI * 0.85;

  drawDonutBody(ctx, outerR, ringWidth, innerR, bodyGrad, '#8B6914', frosting.main, frosting.highlight, frostStart, frostEnd, style, cellSize);

  // Draw happy face
  drawHappyFace(ctx, cellSize, outerR, ringWidth, style);

  // Sparkle dots around happy donut
  const now = performance.now() / 1000;
  for (let i = 0; i < 4; i++) {
    const angle = now * 1.5 + (Math.PI * 2 / 4) * i;
    const dist = outerR + cellSize * 0.06;
    const sx = Math.cos(angle) * dist;
    const sy = Math.sin(angle) * dist;
    const sparkleAlpha = 0.4 + 0.4 * Math.sin(now * 4 + i * 1.7);
    ctx.fillStyle = `rgba(255, 255, 255, ${sparkleAlpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, cellSize * 0.015, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ─── Sad Face ────────────────────────────────────────────────

function drawSadFace(ctx, cellSize, outerR, ringWidth) {
  // Face is drawn on the upper portion of the donut ring
  // Position: centered horizontally, on the top arc of the ring
  const faceY = -(outerR - ringWidth / 2); // top of ring
  const faceScale = Math.min(1, cellSize / 60); // adaptive detail

  ctx.save();

  if (cellSize >= 60) {
    // Full detail: eyes with droopy lids, eyebrows, frown
    drawSadEyes(ctx, faceY, outerR, ringWidth, cellSize);
    drawSadEyebrows(ctx, faceY, outerR, ringWidth, cellSize);
    drawSadMouth(ctx, faceY, outerR, ringWidth, cellSize);
  } else if (cellSize >= 40) {
    // Medium detail: eyes and mouth only
    drawSadEyes(ctx, faceY, outerR, ringWidth, cellSize);
    drawSadMouth(ctx, faceY, outerR, ringWidth, cellSize);
  } else {
    // Minimal: two dots and a line
    const dotR = cellSize * 0.025;
    const spacing = cellSize * 0.08;
    ctx.fillStyle = SAD_EYE;
    ctx.beginPath();
    ctx.arc(-spacing, faceY, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(spacing, faceY, dotR, 0, Math.PI * 2);
    ctx.fill();
    // Tiny frown
    ctx.strokeStyle = SAD_EYE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, faceY + cellSize * 0.06, cellSize * 0.04, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  }

  ctx.restore();
}

function drawSadEyes(ctx, faceY, outerR, ringWidth, cellSize) {
  const eyeSpacing = cellSize * 0.09;
  const eyeW = cellSize * 0.045;
  const eyeH = cellSize * 0.04;

  for (const side of [-1, 1]) {
    const ex = side * eyeSpacing;
    const ey = faceY;

    // Eye white (oval)
    ctx.fillStyle = '#D0D0D0'; // dull white for sad
    ctx.beginPath();
    ctx.ellipse(ex, ey, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#686868';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Pupil (small, looking down)
    ctx.fillStyle = '#555555';
    ctx.beginPath();
    ctx.arc(ex, ey + eyeH * 0.25, eyeW * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Droopy eyelid (covers top half)
    ctx.fillStyle = SAD_DONUT_BASE;
    ctx.beginPath();
    ctx.ellipse(ex, ey - eyeH * 0.15, eyeW * 1.15, eyeH * 0.7, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }
}

function drawSadEyebrows(ctx, faceY, outerR, ringWidth, cellSize) {
  const browSpacing = cellSize * 0.09;
  const browY = faceY - cellSize * 0.055;
  const browLen = cellSize * 0.055;

  ctx.strokeStyle = '#686868';
  ctx.lineWidth = Math.max(1, cellSize * 0.015);
  ctx.lineCap = 'round';

  // Left brow — angled up in the middle (worried)
  ctx.beginPath();
  ctx.moveTo(-browSpacing - browLen * 0.5, browY - cellSize * 0.01);
  ctx.lineTo(-browSpacing + browLen * 0.5, browY + cellSize * 0.02);
  ctx.stroke();

  // Right brow
  ctx.beginPath();
  ctx.moveTo(browSpacing + browLen * 0.5, browY - cellSize * 0.01);
  ctx.lineTo(browSpacing - browLen * 0.5, browY + cellSize * 0.02);
  ctx.stroke();
}

function drawSadMouth(ctx, faceY, outerR, ringWidth, cellSize) {
  const mouthY = faceY + cellSize * 0.065;
  const mouthW = cellSize * 0.06;

  ctx.strokeStyle = '#686868';
  ctx.lineWidth = Math.max(1, cellSize * 0.015);
  ctx.lineCap = 'round';

  // Downturned frown
  ctx.beginPath();
  ctx.arc(0, mouthY - cellSize * 0.02, mouthW, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
}

// ─── Happy Face ──────────────────────────────────────────────

function drawHappyFace(ctx, cellSize, outerR, ringWidth, style) {
  const faceY = -(outerR - ringWidth / 2);

  ctx.save();

  if (cellSize >= 60) {
    // Full detail: derpy eyes, eyebrows, mouth with tongue, blush
    drawHappyEyes(ctx, faceY, outerR, ringWidth, cellSize, style);
    drawHappyEyebrows(ctx, faceY, outerR, ringWidth, cellSize, style);
    drawHappyMouth(ctx, faceY, outerR, ringWidth, cellSize, style);
    drawBlush(ctx, faceY, outerR, ringWidth, cellSize);
  } else if (cellSize >= 40) {
    // Medium: eyes and mouth
    drawHappyEyes(ctx, faceY, outerR, ringWidth, cellSize, style);
    drawHappyMouth(ctx, faceY, outerR, ringWidth, cellSize, style);
  } else {
    // Minimal: two bright dots and a curve
    const dotR = cellSize * 0.03;
    const spacing = cellSize * 0.08;
    ctx.fillStyle = PUPIL_COLOR;
    ctx.beginPath();
    ctx.arc(-spacing, faceY, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(spacing * 0.9, faceY - cellSize * 0.01, dotR * 0.85, 0, Math.PI * 2);
    ctx.fill();
    // Tiny smile
    ctx.strokeStyle = MOUTH_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, faceY + cellSize * 0.035, cellSize * 0.04, 0, Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}

function drawHappyEyes(ctx, faceY, outerR, ringWidth, cellSize, style) {
  const eyeSpacing = cellSize * 0.09;
  // Derpy: slightly different sizes and heights
  const eyeSizes = [
    { w: cellSize * 0.05, h: cellSize * 0.05 },
    { w: cellSize * 0.042, h: cellSize * 0.042 }
  ];
  const eyeOffsets = [
    { x: -eyeSpacing, y: faceY },
    { x: eyeSpacing * 0.9, y: faceY - cellSize * 0.012 } // right eye slightly higher
  ];

  // Per-style eye tweaks
  const isCrossEyed = style === 'pink_sprinkle';
  const isSleepy = style === 'maple';
  const isSurprised = style === 'boston_cream';
  const isSquinty = style === 'powdered';

  for (let i = 0; i < 2; i++) {
    const { x: ex, y: ey } = eyeOffsets[i];
    let { w: eyeW, h: eyeH } = eyeSizes[i];

    if (isSurprised) {
      eyeW *= 1.15;
      eyeH *= 1.15;
    }

    // Eye white
    ctx.fillStyle = EYE_WHITE;
    ctx.beginPath();
    ctx.ellipse(ex, ey, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = FACE_OUTLINE;
    ctx.lineWidth = Math.max(1, cellSize * 0.012);
    ctx.stroke();

    // Pupil
    let pupilX = ex;
    let pupilY = ey;
    const pupilR = eyeW * 0.5;

    if (isCrossEyed) {
      // Cross-eyed: pupils point inward
      pupilX = ex + (i === 0 ? eyeW * 0.2 : -eyeW * 0.2);
    }

    ctx.fillStyle = PUPIL_COLOR;
    ctx.beginPath();
    ctx.arc(pupilX, pupilY, pupilR, 0, Math.PI * 2);
    ctx.fill();

    // Highlight dot (the "alive" look)
    ctx.fillStyle = EYE_WHITE;
    ctx.beginPath();
    ctx.arc(pupilX - pupilR * 0.3, pupilY - pupilR * 0.3, pupilR * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Sleepy: half-closed eyelids
    if (isSleepy) {
      ctx.fillStyle = DONUT_BASE;
      ctx.beginPath();
      ctx.ellipse(ex, ey - eyeH * 0.2, eyeW * 1.1, eyeH * 0.55, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }

    // Squinty: mostly closed
    if (isSquinty) {
      ctx.fillStyle = DONUT_BASE;
      ctx.beginPath();
      ctx.ellipse(ex, ey - eyeH * 0.05, eyeW * 1.1, eyeH * 0.45, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(ex, ey + eyeH * 0.05, eyeW * 1.1, eyeH * 0.45, 0, 0, Math.PI);
      ctx.fill();
    }
  }
}

function drawHappyEyebrows(ctx, faceY, outerR, ringWidth, cellSize, style) {
  const browSpacing = cellSize * 0.09;
  const browY = faceY - cellSize * 0.06;
  const browLen = cellSize * 0.05;

  ctx.strokeStyle = FACE_OUTLINE;
  ctx.lineWidth = Math.max(1.2, cellSize * 0.018);
  ctx.lineCap = 'round';

  const isGoofy = style === 'chocolate';

  // Left brow — raised high, slight tilt
  ctx.beginPath();
  ctx.moveTo(-browSpacing - browLen * 0.5, browY + cellSize * 0.01);
  ctx.quadraticCurveTo(-browSpacing, browY - cellSize * (isGoofy ? 0.03 : 0.02), -browSpacing + browLen * 0.5, browY);
  ctx.stroke();

  // Right brow — slightly different angle for derpiness
  ctx.beginPath();
  ctx.moveTo(browSpacing * 0.9 - browLen * 0.5, browY - cellSize * 0.005);
  ctx.quadraticCurveTo(browSpacing * 0.9, browY - cellSize * 0.025, browSpacing * 0.9 + browLen * 0.5, browY + cellSize * 0.008);
  ctx.stroke();
}

function drawHappyMouth(ctx, faceY, outerR, ringWidth, cellSize, style) {
  const mouthY = faceY + cellSize * 0.06;
  const mouthW = cellSize * 0.07;
  const mouthH = cellSize * 0.04;

  const isGoofy = style === 'chocolate';
  const isSurprised = style === 'boston_cream';
  const isSquinty = style === 'powdered';
  const hasTongue = style === 'pink_sprinkle' || style === 'glazed';

  if (isSurprised) {
    // Round open mouth (surprised "O")
    ctx.fillStyle = MOUTH_COLOR;
    ctx.beginPath();
    ctx.ellipse(0, mouthY, mouthW * 0.5, mouthH * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = FACE_OUTLINE;
    ctx.lineWidth = Math.max(1, cellSize * 0.012);
    ctx.stroke();
    // Inner darkness
    ctx.fillStyle = '#3D0000';
    ctx.beginPath();
    ctx.ellipse(0, mouthY, mouthW * 0.3, mouthH * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (isSquinty) {
    // Wide open mouth (sneeze/laugh)
    ctx.fillStyle = MOUTH_COLOR;
    ctx.beginPath();
    ctx.ellipse(0, mouthY + cellSize * 0.01, mouthW * 0.8, mouthH * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = FACE_OUTLINE;
    ctx.lineWidth = Math.max(1, cellSize * 0.012);
    ctx.stroke();
    // Tongue inside
    ctx.fillStyle = TONGUE_COLOR;
    ctx.beginPath();
    ctx.ellipse(0, mouthY + mouthH * 0.7, mouthW * 0.4, mouthH * 0.5, 0, 0, Math.PI);
    ctx.fill();
    return;
  }

  // Wide smile arc
  const smileW = isGoofy ? mouthW * 1.2 : mouthW;
  ctx.fillStyle = MOUTH_COLOR;
  ctx.beginPath();
  ctx.moveTo(-smileW, mouthY);
  ctx.quadraticCurveTo(-smileW * 0.5, mouthY + mouthH * 2.5, 0, mouthY + mouthH * 2);
  ctx.quadraticCurveTo(smileW * 0.5, mouthY + mouthH * 2.5, smileW, mouthY);
  ctx.quadraticCurveTo(smileW * 0.3, mouthY + mouthH * 0.5, 0, mouthY + mouthH * 0.3);
  ctx.quadraticCurveTo(-smileW * 0.3, mouthY + mouthH * 0.5, -smileW, mouthY);
  ctx.fill();
  ctx.strokeStyle = FACE_OUTLINE;
  ctx.lineWidth = Math.max(1, cellSize * 0.012);
  ctx.stroke();

  // Teeth (tiny white rectangles along top of mouth)
  if (cellSize >= 55) {
    const teethCount = isGoofy ? 4 : 2;
    const teethW = smileW * 1.2 / teethCount;
    const teethH = mouthH * 0.4;
    ctx.fillStyle = EYE_WHITE;
    for (let t = 0; t < teethCount; t++) {
      const tx = -smileW * 0.6 + t * teethW + teethW * 0.15;
      ctx.fillRect(tx, mouthY + mouthH * 0.2, teethW * 0.7, teethH);
    }
  }

  // Tongue poking out one side
  if (hasTongue) {
    const tongueX = smileW * 0.35;
    const tongueY2 = mouthY + mouthH * 1.8;
    ctx.fillStyle = TONGUE_COLOR;
    ctx.beginPath();
    ctx.ellipse(tongueX, tongueY2, mouthW * 0.25, mouthH * 0.6, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = FACE_OUTLINE;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

function drawBlush(ctx, faceY, outerR, ringWidth, cellSize) {
  const blushY = faceY + cellSize * 0.04;
  const blushSpacing = cellSize * 0.13;
  const blushR = cellSize * 0.025;

  ctx.fillStyle = BLUSH_COLOR;
  ctx.beginPath();
  ctx.arc(-blushSpacing, blushY, blushR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(blushSpacing, blushY, blushR, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Draw Source ─────────────────────────────────────────────

function drawSource(ctx, cx, cy, cellSize, inFlow, inWinCelebration, winElapsed) {
  const unit = cellSize * 0.07;

  ctx.save();
  ctx.translate(cx, cy);

  // Flow glow
  if (inFlow) {
    const glowPulse = inWinCelebration
      ? 0.6 + 0.4 * Math.sin(winElapsed * 6)
      : 0.3 + 0.15 * Math.sin(performance.now() / 500);
    ctx.shadowColor = '#FF1493';
    ctx.shadowBlur = cellSize * 0.3 * glowPulse;
  }

  // Bowl/base
  const baseW = unit * 5;
  const baseH = unit * 2;
  const baseY = unit * 2;
  const baseGrad = ctx.createLinearGradient(-baseW, baseY, baseW, baseY + baseH);
  baseGrad.addColorStop(0, '#6B3A1F');
  baseGrad.addColorStop(0.5, '#8B5E3C');
  baseGrad.addColorStop(1, '#5C3317');

  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.moveTo(-baseW, baseY + baseH);
  ctx.lineTo(-baseW * 0.7, baseY);
  ctx.lineTo(baseW * 0.7, baseY);
  ctx.lineTo(baseW, baseY + baseH);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PIPE_OUTLINE;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Middle tier
  const midY = unit * 0.5;
  const midRx = unit * 3.5;
  const midRy = unit * 1.5;
  const midGrad = ctx.createRadialGradient(
    -midRx * 0.2, midY - midRy * 0.3, midRy * 0.1,
    0, midY, midRx
  );
  midGrad.addColorStop(0, '#9B6B3A');
  midGrad.addColorStop(0.7, '#7B4B2A');
  midGrad.addColorStop(1, '#5C3317');

  ctx.fillStyle = midGrad;
  ctx.beginPath();
  ctx.ellipse(0, midY, midRx, midRy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PIPE_OUTLINE;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Top tier
  const topY = -unit * 2;
  const topR = unit * 2;
  const topGrad = ctx.createRadialGradient(
    -topR * 0.3, topY - topR * 0.3, topR * 0.15,
    0, topY, topR
  );
  topGrad.addColorStop(0, inFlow ? '#FF69B4' : '#9B6B3A');
  topGrad.addColorStop(0.6, inFlow ? '#FF1493' : '#7B4B2A');
  topGrad.addColorStop(1, inFlow ? '#8B0A50' : '#5C3317');

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  ctx.fillStyle = topGrad;
  ctx.beginPath();
  ctx.arc(0, topY, topR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PIPE_OUTLINE;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Highlight dot
  ctx.fillStyle = inFlow ? 'rgba(255, 182, 223, 0.6)' : 'rgba(200, 170, 120, 0.4)';
  ctx.beginPath();
  ctx.arc(-topR * 0.25, topY - topR * 0.25, topR * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ─── Lock Indicator (Pin icon) ───────────────────────────────

function drawLockIndicator(ctx, x, y, cellSize) {
  const pinX = x + cellSize - cellSize * 0.15;
  const pinY = y + cellSize * 0.15;
  const headR = cellSize * 0.055;
  const bodyH = cellSize * 0.07;

  ctx.save();

  ctx.fillStyle = '#E03030';
  ctx.strokeStyle = '#A01010';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(pinX, pinY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(pinX - headR * 0.25, pinY - headR * 0.25, headR * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#B0B0B0';
  ctx.strokeStyle = '#808080';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(pinX - headR * 0.4, pinY + headR);
  ctx.lineTo(pinX + headR * 0.4, pinY + headR);
  ctx.lineTo(pinX, pinY + headR + bodyH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

// ─── Sprinkle Particles (dense flow through all pipes) ───────

const MAX_PARTICLES = 200;
const PARTICLE_SPEED_MIN = 40;
const PARTICLE_SPEED_MAX = 80;

export function updateParticles(state, model, deltaMs) {
  const { particles, cellSize } = state;
  const dt = deltaMs / 1000;

  // Spawn particles from ALL flowing tiles (not just source)
  if (model.flowState.size > 1 && particles.length < MAX_PARTICLES) {
    for (const key of model.flowState) {
      // Low probability per tile per frame to keep density reasonable
      if (Math.random() > 0.05) continue;
      if (particles.length >= MAX_PARTICLES) break;

      const tile = model.tiles.get(key);
      if (!tile) continue;

      const active = getActiveConnections(tile);
      if (active.length === 0) continue;

      const dir = active[Math.floor(Math.random() * active.length)];
      const speed = PARTICLE_SPEED_MIN + Math.random() * (PARTICLE_SPEED_MAX - PARTICLE_SPEED_MIN);
      const shape = Math.floor(Math.random() * 3);
      const size = 2 + Math.random() * 3;

      particles.push({
        x: tile.col * cellSize + cellSize / 2,
        y: tile.row * cellSize + cellSize / 2,
        dx: DIR_OFFSET[dir][1] * speed,
        dy: DIR_OFFSET[dir][0] * speed,
        color: SPRINKLE_COLORS[Math.floor(Math.random() * SPRINKLE_COLORS.length)],
        life: 1.0,
        shape,
        size,
        spin: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 4
      });
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.dx * dt;
    p.y += p.dy * dt;
    p.life -= dt * 0.5;
    p.spin += p.spinSpeed * dt;

    // Constrain within pipe bounds (keep within cell center +/- pipeWidth)
    const col = Math.floor(p.x / cellSize);
    const row = Math.floor(p.y / cellSize);
    const key = coordKey(row, col);
    if (p.life <= 0 || !model.flowState.has(key)) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles(state, model) {
  const { ctx, particles } = state;

  for (const p of particles) {
    const alpha = Math.max(0, p.life);

    // Motion trail
    ctx.globalAlpha = alpha * 0.2;
    ctx.fillStyle = p.color;
    const trailX = p.x - p.dx * 0.02;
    const trailY = p.y - p.dy * 0.02;
    drawParticleShape(ctx, trailX, trailY, p);

    // Main particle
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    drawParticleShape(ctx, p.x, p.y, p);
  }
  ctx.globalAlpha = 1;
}

function drawParticleShape(ctx, x, y, p) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.spin);

  const s = p.size;
  if (p.shape === 0) {
    // Rectangle sprinkle
    ctx.fillRect(-s, -s * 0.4, s * 2, s * 0.8);
  } else if (p.shape === 1) {
    // Circle sprinkle
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Ellipse sprinkle
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ─── Win Celebration ─────────────────────────────────────────

export function triggerWinCelebration(state, model) {
  state.winTime = performance.now();

  for (const t of model.terminals) {
    const cx = t.col * state.cellSize + state.cellSize / 2;
    const cy = t.row * state.cellSize + state.cellSize / 2;
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 / 16) * i + (Math.random() - 0.5) * 0.3;
      const speed = 60 + Math.random() * 60;
      const shape = Math.floor(Math.random() * 3);
      const size = 2 + Math.random() * 3;
      state.particles.push({
        x: cx,
        y: cy,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        color: SPRINKLE_COLORS[Math.floor(Math.random() * SPRINKLE_COLORS.length)],
        life: 1.8,
        shape,
        size,
        spin: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 6
      });
    }
  }
}

// ─── Hit Testing ─────────────────────────────────────────────

export function cellFromPoint(state, model, clientX, clientY) {
  const rect = state.canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const col = Math.floor(x / state.cellSize);
  const row = Math.floor(y / state.cellSize);

  if (row >= 0 && row < model.height && col >= 0 && col < model.width) {
    return { row, col };
  }
  return null;
}
