// Glaze Rush — Canvas Renderer
// Glass pipes, sprinkle flow, donut characters with faces.

import {
  GAME_BG, SPRINKLE_COLORS,
  DONUT_BASE_SHADOW,
  HAPPY_FROSTING, SAD_FROSTING,
  PIPE_OUTLINE,
  GLASS_TINT, GLASS_OUTLINE, GLASS_HIGHLIGHT, GLASS_SHADOW, GLASS_FLOW_FILL,
  FACE_OUTLINE, EYE_WHITE, PUPIL_COLOR, TONGUE_COLOR, BLUSH_COLOR, MOUTH_COLOR,
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
  const outerR = cellSize * 0.42;
  const innerR = cellSize * 0.10;
  const outlineW = Math.max(2, cellSize * 0.025);

  // Filled donut types have no visible hole
  const isFilled = (style === 'boston_cream' || style === 'powdered');

  if (inFlow) {
    drawHappyDonut(ctx, cx, cy, cellSize, style, outerR, innerR, outlineW, isFilled, inWinCelebration, winElapsed);
  } else {
    drawSadDonut(ctx, cx, cy, cellSize, style, outerR, innerR, outlineW, isFilled);
  }
}

// ─── Donut Body (new cartoon-style) ──────────────────────────

function drawDonutBodyRing(ctx, outerR, innerR, outlineW, bodyColor, bodyShadow, frostColor, frostHighlight, frostStart, frostEnd, style, cellSize) {
  // Solid donut body fill (ring shape using evenodd)
  const bodyGrad = ctx.createRadialGradient(
    -outerR * 0.25, -outerR * 0.25, outerR * 0.1,
    0, 0, outerR
  );
  bodyGrad.addColorStop(0, bodyColor);
  bodyGrad.addColorStop(0.7, bodyShadow);
  bodyGrad.addColorStop(1, bodyShadow);

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.arc(0, 0, innerR, 0, Math.PI * 2, true);
  ctx.fill('evenodd');

  // Frosting on top half — thick arc
  const ringMid = (outerR + innerR) / 2;
  const ringWidth = outerR - innerR;
  ctx.strokeStyle = frostColor;
  ctx.lineWidth = ringWidth * 0.65;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.arc(0, 0, ringMid, frostStart, frostEnd);
  ctx.stroke();

  // Frosting highlight
  if (frostHighlight) {
    ctx.strokeStyle = frostHighlight;
    ctx.lineWidth = ringWidth * 0.2;
    ctx.beginPath();
    ctx.arc(0, 0, ringMid + ringWidth * 0.12, frostStart + 0.3, frostStart + (frostEnd - frostStart) * 0.5);
    ctx.stroke();
  }

  // Style-specific details on frosting
  drawFrostingDetails(ctx, style, outerR, innerR, frostStart, frostEnd, cellSize);

  // Bold cartoon outline — outer
  ctx.strokeStyle = FACE_OUTLINE;
  ctx.lineWidth = outlineW;
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.stroke();

  // Bold cartoon outline — inner hole
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.stroke();

  // Hole shading
  const holeGrad = ctx.createRadialGradient(0, 0, innerR * 0.2, 0, 0, innerR);
  holeGrad.addColorStop(0, 'rgba(60, 30, 10, 0.4)');
  holeGrad.addColorStop(1, 'rgba(80, 50, 20, 0.15)');
  ctx.fillStyle = holeGrad;
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.fill();
}

function drawDonutBodyFilled(ctx, outerR, outlineW, bodyColor, bodyShadow, topColor, topHighlight, cellSize, style) {
  // Filled donut (boston_cream, powdered) — solid oval, no hole
  const ovalH = outerR * 0.75;

  // Body fill
  const bodyGrad = ctx.createRadialGradient(
    -outerR * 0.2, -ovalH * 0.2, outerR * 0.1,
    0, 0, outerR
  );
  bodyGrad.addColorStop(0, bodyColor);
  bodyGrad.addColorStop(0.8, bodyShadow);

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, outerR, ovalH, 0, 0, Math.PI * 2);
  ctx.fill();

  // Top coating (chocolate for boston_cream, sugar for powdered)
  ctx.fillStyle = topColor;
  ctx.beginPath();
  ctx.ellipse(0, -ovalH * 0.1, outerR * 0.92, ovalH * 0.65, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  if (topHighlight) {
    ctx.fillStyle = topHighlight;
    ctx.beginPath();
    ctx.ellipse(-outerR * 0.15, -ovalH * 0.35, outerR * 0.35, ovalH * 0.18, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bold outline
  ctx.strokeStyle = FACE_OUTLINE;
  ctx.lineWidth = outlineW;
  ctx.beginPath();
  ctx.ellipse(0, 0, outerR, ovalH, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawFrostingDetails(ctx, style, outerR, innerR, frostStart, frostEnd, cellSize) {
  const ringMid = (outerR + innerR) / 2;
  const ringWidth = outerR - innerR;

  if (style === 'pink_sprinkle') {
    // Colorful sprinkles scattered on frosting
    for (let i = 0; i < 12; i++) {
      const angle = frostStart + (frostEnd - frostStart) * (i + 0.5) / 12;
      const sr = ringMid + (Math.sin(i * 7.3) * ringWidth * 0.15);
      const sx = Math.cos(angle) * sr;
      const sy = Math.sin(angle) * sr;
      const rot = (i * 47) % 360 * Math.PI / 180;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(rot);
      ctx.fillStyle = SPRINKLE_COLORS[i % SPRINKLE_COLORS.length];
      const sw = cellSize * 0.03;
      const sh = cellSize * 0.01;
      ctx.fillRect(-sw, -sh, sw * 2, sh * 2);
      ctx.restore();
    }
  } else if (style === 'maple') {
    // Drizzle lines on frosting
    ctx.strokeStyle = 'rgba(160, 120, 40, 0.4)';
    ctx.lineWidth = ringWidth * 0.08;
    for (let i = 0; i < 3; i++) {
      const a1 = frostStart + (frostEnd - frostStart) * (0.15 + i * 0.28);
      ctx.beginPath();
      ctx.arc(0, 0, ringMid + ringWidth * (0.05 - i * 0.08), a1, a1 + 0.4);
      ctx.stroke();
    }
  }
}

// ─── Sad Donut (unfilled — gray, droopy, sad face) ───────────

function drawSadDonut(ctx, cx, cy, cellSize, style, outerR, innerR, outlineW, isFilled) {
  const scale = 0.92;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  if (isFilled) {
    const topColor = style === 'boston_cream' ? '#7A6A5A' : '#C8C0B8';
    const topHL = style === 'boston_cream' ? 'rgba(140,130,120,0.3)' : 'rgba(220,215,210,0.3)';
    drawDonutBodyFilled(ctx, outerR, outlineW, '#B0A898', '#908878', topColor, topHL, cellSize, style);
  } else {
    const droopStart = -Math.PI * 0.15;
    const droopEnd = Math.PI * 1.15;
    drawDonutBodyRing(ctx, outerR, innerR, outlineW, '#B8B0A8', '#908880', SAD_FROSTING, null, droopStart, droopEnd, null, cellSize);
  }

  drawSadFace(ctx, cellSize, style, outerR, innerR, outlineW, isFilled);

  ctx.restore();
}

// ─── Happy Donut (filled — vibrant, cartoon face) ─────────────

function drawHappyDonut(ctx, cx, cy, cellSize, style, outerR, innerR, outlineW, isFilled, inWinCelebration, winElapsed) {
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

  // Draw body
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  if (isFilled) {
    const topColor = style === 'boston_cream' ? frosting.cap || '#5C3317' : frosting.main;
    const topHL = frosting.highlight ? frosting.highlight + '88' : null;
    drawDonutBodyFilled(ctx, outerR, outlineW, '#F0D080', DONUT_BASE_SHADOW, topColor, topHL, cellSize, style);
  } else {
    const frostStart = -Math.PI * 0.85;
    const frostEnd = Math.PI * 0.85;
    drawDonutBodyRing(ctx, outerR, innerR, outlineW, '#F0D080', DONUT_BASE_SHADOW, frosting.main, frosting.highlight, frostStart, frostEnd, style, cellSize);
  }

  // Draw happy face
  drawHappyFace(ctx, cellSize, style, outerR, innerR, outlineW, isFilled);

  // Sparkle dots
  const now = performance.now() / 1000;
  for (let i = 0; i < 4; i++) {
    const angle = now * 1.5 + (Math.PI * 2 / 4) * i;
    const dist = outerR + cellSize * 0.04;
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

// ─── Sad Face (heavy eyelids, desaturated, droopy) ───────────

function drawSadFace(ctx, cellSize, style, outerR, innerR, outlineW, isFilled) {
  const eyeY = -outerR * 0.25;
  const mouthY = outerR * 0.35;
  const eyeSpacing = outerR * 0.36;
  const lineW = Math.max(1.5, cellSize * 0.022);
  const sadSkin = '#B0A898';

  if (cellSize >= 70) {
    drawSadEyes(ctx, eyeY, eyeSpacing, outerR, cellSize, lineW, sadSkin);
    drawSadEyebrows(ctx, eyeY, eyeSpacing, outerR, cellSize, lineW);
    drawSadMouth(ctx, mouthY, outerR, cellSize, lineW);
    if (style === 'maple' && cellSize >= 70) {
      drawTears(ctx, eyeY, eyeSpacing, outerR, cellSize);
    }
  } else if (cellSize >= 45) {
    drawSadEyes(ctx, eyeY, eyeSpacing, outerR, cellSize, lineW, sadSkin);
    drawSadMouth(ctx, mouthY, outerR, cellSize, lineW);
  } else {
    // Minimal: two dim dots + frown
    const dotR = outerR * 0.08;
    const sp = outerR * 0.26;
    ctx.fillStyle = '#777';
    ctx.beginPath();
    ctx.arc(-sp, eyeY, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sp, eyeY, dotR, 0, Math.PI * 2);
    ctx.fill();
    // Frown
    ctx.strokeStyle = '#666';
    ctx.lineWidth = Math.max(1.5, cellSize * 0.025);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, mouthY + outerR * 0.05, outerR * 0.14, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  }
}

function drawSadEyes(ctx, eyeY, eyeSpacing, outerR, cellSize, lineW, sadSkin) {
  const eyeR = outerR * 0.16;

  for (const side of [-1, 1]) {
    const ex = side * eyeSpacing;
    const ey = eyeY;

    // Dull eye white
    ctx.fillStyle = '#D8D4D0';
    ctx.beginPath();
    ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#686060';
    ctx.lineWidth = lineW;
    ctx.beginPath();
    ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
    ctx.stroke();

    // Small pupil looking down
    const pupilR = eyeR * 0.4;
    ctx.fillStyle = '#4A4040';
    ctx.beginPath();
    ctx.arc(ex, ey + eyeR * 0.25, pupilR, 0, Math.PI * 2);
    ctx.fill();

    // Tiny dim highlight
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(ex - pupilR * 0.25, ey + eyeR * 0.1, pupilR * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // HEAVY droopy eyelid — covers 65% of eye from top (the key sad expression)
    drawEyelid(ctx, ex, ey, eyeR, 0.65, sadSkin, lineW);
  }
}

function drawSadEyebrows(ctx, eyeY, eyeSpacing, outerR, cellSize, lineW) {
  const browY = eyeY - outerR * 0.22;
  const browLen = outerR * 0.2;

  ctx.strokeStyle = '#686060';
  ctx.lineWidth = lineW * 1.2;
  ctx.lineCap = 'round';

  // Worried angle — inner ends up, outer ends down
  // Left brow
  ctx.beginPath();
  ctx.moveTo(-eyeSpacing - browLen * 0.5, browY - outerR * 0.03);
  ctx.lineTo(-eyeSpacing + browLen * 0.5, browY + outerR * 0.05);
  ctx.stroke();

  // Right brow
  ctx.beginPath();
  ctx.moveTo(eyeSpacing + browLen * 0.5, browY - outerR * 0.03);
  ctx.lineTo(eyeSpacing - browLen * 0.5, browY + outerR * 0.05);
  ctx.stroke();
}

function drawSadMouth(ctx, mouthY, outerR, cellSize, lineW) {
  const mouthW = outerR * 0.25;

  ctx.strokeStyle = '#686060';
  ctx.lineWidth = lineW * 1.3;
  ctx.lineCap = 'round';

  // Pronounced downturned frown
  ctx.beginPath();
  ctx.moveTo(-mouthW, mouthY - outerR * 0.06);
  ctx.quadraticCurveTo(0, mouthY + outerR * 0.12, mouthW, mouthY - outerR * 0.06);
  ctx.stroke();
}

function drawTears(ctx, eyeY, eyeSpacing, outerR, cellSize) {
  // Tears streaming down from eyes (maple style)
  ctx.fillStyle = 'rgba(140, 180, 220, 0.5)';

  for (const side of [-1, 1]) {
    const tx = side * eyeSpacing + side * outerR * 0.05;
    const startY = eyeY + outerR * 0.15;

    // Tear drop
    ctx.beginPath();
    ctx.moveTo(tx, startY);
    ctx.quadraticCurveTo(tx - outerR * 0.04, startY + outerR * 0.15, tx, startY + outerR * 0.25);
    ctx.quadraticCurveTo(tx + outerR * 0.04, startY + outerR * 0.15, tx, startY);
    ctx.fill();

    // Tear trail
    ctx.strokeStyle = 'rgba(140, 180, 220, 0.3)';
    ctx.lineWidth = outerR * 0.04;
    ctx.beginPath();
    ctx.moveTo(tx, startY + outerR * 0.2);
    ctx.lineTo(tx + side * outerR * 0.03, startY + outerR * 0.5);
    ctx.stroke();
  }
}

// ─── Happy Face (new cartoon style — face spans entire donut) ─

function drawHappyFace(ctx, cellSize, style, outerR, innerR, outlineW, isFilled) {
  // Face center is at donut center (0,0) — eyes above hole, mouth below
  const eyeY = -outerR * 0.28;   // eyes well above the hole
  const mouthY = outerR * 0.32;  // mouth well below the hole
  const eyeSpacing = outerR * 0.38;
  const lineW = Math.max(1.5, cellSize * 0.022);

  if (cellSize >= 70) {
    // Full detail
    drawHappyEyes(ctx, eyeY, eyeSpacing, outerR, cellSize, style, lineW);
    drawHappyEyebrows(ctx, eyeY, eyeSpacing, outerR, cellSize, style, lineW);
    drawHappyMouth(ctx, mouthY, outerR, cellSize, style, lineW);
    if (style === 'powdered') {
      drawBlush(ctx, mouthY - outerR * 0.12, outerR, cellSize);
    }
  } else if (cellSize >= 45) {
    // Medium detail — eyes with eyelids + mouth, no brows/blush
    drawHappyEyes(ctx, eyeY, eyeSpacing, outerR, cellSize, style, lineW);
    drawHappyMouth(ctx, mouthY, outerR, cellSize, style, lineW);
  } else {
    // Minimal — two oval dots + curved line
    const dotR = outerR * 0.10;
    const sp = outerR * 0.28;
    ctx.fillStyle = PUPIL_COLOR;
    ctx.beginPath();
    ctx.arc(-sp, eyeY, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sp, eyeY, dotR * 0.9, 0, Math.PI * 2);
    ctx.fill();
    // Smile
    ctx.strokeStyle = FACE_OUTLINE;
    ctx.lineWidth = Math.max(1.5, cellSize * 0.025);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, mouthY - outerR * 0.1, outerR * 0.18, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }
}

function drawHappyEyes(ctx, eyeY, eyeSpacing, outerR, cellSize, style, lineW) {
  // Eye size: ~18% of donut diameter — big cartoon eyes
  const baseEyeR = outerR * 0.18;

  // Per-style personality
  const isCrazy = style === 'pink_sprinkle';
  const isSleepy = style === 'maple' || style === 'glazed';
  const isSurprised = style === 'boston_cream';
  const isSquinty = style === 'powdered';

  // Mismatched eye sizes for pink_sprinkle
  const eyeConfigs = isCrazy
    ? [{ r: baseEyeR * 1.15, x: -eyeSpacing * 0.95, y: eyeY - outerR * 0.02 },
       { r: baseEyeR * 0.85, x: eyeSpacing * 1.0, y: eyeY + outerR * 0.03 }]
    : [{ r: baseEyeR, x: -eyeSpacing, y: eyeY },
       { r: isSurprised ? baseEyeR * 1.08 : baseEyeR * 0.95, x: eyeSpacing, y: eyeY }];

  for (let i = 0; i < 2; i++) {
    const { r: eyeR, x: ex, y: ey } = eyeConfigs[i];
    const pupilR = eyeR * 0.55;

    // Eye white
    ctx.fillStyle = EYE_WHITE;
    ctx.beginPath();
    ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // Bold outline
    ctx.strokeStyle = FACE_OUTLINE;
    ctx.lineWidth = lineW;
    ctx.beginPath();
    ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
    ctx.stroke();

    // Iris + pupil
    let px = ex, py = ey;
    if (isCrazy) {
      px = ex + (i === 0 ? eyeR * 0.15 : -eyeR * 0.2);
      py = ey + eyeR * 0.05;
    }

    // X-pupil for one eye of pink_sprinkle
    if (isCrazy && i === 0) {
      const xSize = eyeR * 0.35;
      ctx.strokeStyle = PUPIL_COLOR;
      ctx.lineWidth = lineW * 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px - xSize, py - xSize);
      ctx.lineTo(px + xSize, py + xSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px + xSize, py - xSize);
      ctx.lineTo(px - xSize, py + xSize);
      ctx.stroke();
    } else {
      // Normal round pupil
      ctx.fillStyle = '#2A1A0A';
      ctx.beginPath();
      ctx.arc(px, py, pupilR, 0, Math.PI * 2);
      ctx.fill();

      // Highlight (life in the eyes)
      ctx.fillStyle = EYE_WHITE;
      ctx.beginPath();
      ctx.arc(px - pupilR * 0.3, py - pupilR * 0.35, pupilR * 0.35, 0, Math.PI * 2);
      ctx.fill();
      // Small secondary highlight
      ctx.beginPath();
      ctx.arc(px + pupilR * 0.25, py + pupilR * 0.2, pupilR * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyelids — THE primary expression tool
    const skinColor = '#E8C880';

    if (isSleepy) {
      // Half-lidded (50% coverage from top)
      drawEyelid(ctx, ex, ey, eyeR, 0.50, skinColor, lineW);
    } else if (isSquinty) {
      // Nearly closed — top and bottom lids
      drawEyelid(ctx, ex, ey, eyeR, 0.55, skinColor, lineW);
      drawEyelidBottom(ctx, ex, ey, eyeR, 0.40, skinColor, lineW);
    } else if (isCrazy || isSurprised) {
      // Wide open — tiny eyelid (~15%)
      drawEyelid(ctx, ex, ey, eyeR, 0.15, skinColor, lineW);
    } else {
      // Normal open (~25%)
      drawEyelid(ctx, ex, ey, eyeR, 0.25, skinColor, lineW);
    }
  }
}

function drawEyelid(ctx, ex, ey, eyeR, coverage, skinColor, lineW) {
  // coverage: 0.0 (fully open) to 1.0 (fully closed)
  // Draws from top of eye downward
  const lidY = ey - eyeR + eyeR * 2 * coverage;

  ctx.save();
  ctx.beginPath();
  ctx.arc(ex, ey, eyeR + 0.5, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.rect(ex - eyeR - 2, ey - eyeR - 2, eyeR * 2 + 4, (lidY - (ey - eyeR)) + 2);
  ctx.fill();

  ctx.restore();

  // Thick eyelid line at the edge
  ctx.strokeStyle = FACE_OUTLINE;
  ctx.lineWidth = lineW * 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  // Slight droop curve for natural look
  ctx.moveTo(ex - eyeR * 0.95, lidY - eyeR * 0.05);
  ctx.quadraticCurveTo(ex, lidY + eyeR * 0.08, ex + eyeR * 0.95, lidY - eyeR * 0.02);
  ctx.stroke();
}

function drawEyelidBottom(ctx, ex, ey, eyeR, coverage, skinColor, lineW) {
  // Bottom eyelid rising up
  const lidY = ey + eyeR - eyeR * 2 * coverage;

  ctx.save();
  ctx.beginPath();
  ctx.arc(ex, ey, eyeR + 0.5, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.rect(ex - eyeR - 2, lidY, eyeR * 2 + 4, eyeR * 2);
  ctx.fill();

  ctx.restore();

  // Bottom lid line
  ctx.strokeStyle = FACE_OUTLINE;
  ctx.lineWidth = lineW;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ex - eyeR * 0.85, lidY + eyeR * 0.03);
  ctx.quadraticCurveTo(ex, lidY - eyeR * 0.06, ex + eyeR * 0.85, lidY + eyeR * 0.05);
  ctx.stroke();
}

function drawHappyEyebrows(ctx, eyeY, eyeSpacing, outerR, cellSize, style, lineW) {
  const browY = eyeY - outerR * 0.22;
  const browLen = outerR * 0.22;

  ctx.strokeStyle = FACE_OUTLINE;
  ctx.lineWidth = lineW * 1.3;
  ctx.lineCap = 'round';

  const isSleepy = style === 'maple' || style === 'glazed';
  const isSquinty = style === 'powdered';
  const isCrazy = style === 'pink_sprinkle';

  if (isSleepy) {
    // Relaxed flat brows
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * eyeSpacing - side * browLen * 0.5, browY);
      ctx.quadraticCurveTo(side * eyeSpacing, browY - outerR * 0.02, side * eyeSpacing + side * browLen * 0.5, browY + outerR * 0.01);
      ctx.stroke();
    }
  } else if (isSquinty) {
    // Smug angled brows
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * eyeSpacing - side * browLen * 0.5, browY + outerR * 0.04);
      ctx.lineTo(side * eyeSpacing + side * browLen * 0.5, browY - outerR * 0.03);
      ctx.stroke();
    }
  } else if (isCrazy) {
    // Wild asymmetric brows
    ctx.beginPath();
    ctx.moveTo(-eyeSpacing - browLen * 0.5, browY + outerR * 0.03);
    ctx.lineTo(-eyeSpacing + browLen * 0.5, browY - outerR * 0.06);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(eyeSpacing - browLen * 0.5, browY - outerR * 0.04);
    ctx.lineTo(eyeSpacing + browLen * 0.5, browY + outerR * 0.02);
    ctx.stroke();
  } else {
    // Normal raised brows (boston_cream, chocolate)
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * eyeSpacing - side * browLen * 0.5, browY + outerR * 0.02);
      ctx.quadraticCurveTo(side * eyeSpacing, browY - outerR * 0.04, side * eyeSpacing + side * browLen * 0.5, browY);
      ctx.stroke();
    }
  }
}

function drawHappyMouth(ctx, mouthY, outerR, cellSize, style, lineW) {
  const mouthW = outerR * 0.38;
  const mouthH = outerR * 0.22;

  const isCrazy = style === 'pink_sprinkle';
  const isSleepy = style === 'maple' || style === 'glazed';
  const isSurprised = style === 'boston_cream';
  const isSquinty = style === 'powdered';

  if (isSurprised) {
    // Round open "O" mouth
    ctx.fillStyle = MOUTH_COLOR;
    ctx.beginPath();
    ctx.ellipse(0, mouthY, mouthW * 0.45, mouthH * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = FACE_OUTLINE;
    ctx.lineWidth = lineW;
    ctx.stroke();
    // Darkness inside
    ctx.fillStyle = '#2A0000';
    ctx.beginPath();
    ctx.ellipse(0, mouthY + mouthH * 0.05, mouthW * 0.25, mouthH * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (isSquinty) {
    // Sly smirk — curved line, slightly open on one side
    ctx.strokeStyle = FACE_OUTLINE;
    ctx.lineWidth = lineW * 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-mouthW * 0.6, mouthY + mouthH * 0.1);
    ctx.quadraticCurveTo(0, mouthY - mouthH * 0.3, mouthW * 0.7, mouthY - mouthH * 0.15);
    ctx.stroke();
    return;
  }

  if (isSleepy) {
    // Small confident closed smile
    ctx.strokeStyle = FACE_OUTLINE;
    ctx.lineWidth = lineW * 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-mouthW * 0.55, mouthY - mouthH * 0.1);
    ctx.quadraticCurveTo(0, mouthY + mouthH * 0.5, mouthW * 0.55, mouthY - mouthH * 0.1);
    ctx.stroke();
    return;
  }

  // Wide open grin (pink_sprinkle, chocolate, default)
  ctx.fillStyle = MOUTH_COLOR;
  ctx.beginPath();
  ctx.moveTo(-mouthW, mouthY - mouthH * 0.2);
  ctx.quadraticCurveTo(-mouthW * 0.5, mouthY + mouthH * 1.2, 0, mouthY + mouthH);
  ctx.quadraticCurveTo(mouthW * 0.5, mouthY + mouthH * 1.2, mouthW, mouthY - mouthH * 0.2);
  ctx.quadraticCurveTo(mouthW * 0.3, mouthY + mouthH * 0.2, 0, mouthY);
  ctx.quadraticCurveTo(-mouthW * 0.3, mouthY + mouthH * 0.2, -mouthW, mouthY - mouthH * 0.2);
  ctx.fill();
  ctx.strokeStyle = FACE_OUTLINE;
  ctx.lineWidth = lineW;
  ctx.stroke();

  // Teeth along top edge
  if (cellSize >= 60) {
    const teethCount = isCrazy ? 4 : 3;
    const startX = -mouthW * 0.7;
    const teethW = (mouthW * 1.4) / teethCount;
    ctx.fillStyle = EYE_WHITE;
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.5;
    for (let t = 0; t < teethCount; t++) {
      const tx = startX + t * teethW;
      const ty = mouthY - mouthH * 0.1;
      const tw = teethW * 0.85;
      const th = mouthH * 0.35;
      ctx.fillRect(tx, ty, tw, th);
      ctx.strokeRect(tx, ty, tw, th);
    }
  }

  // Tongue
  if (isCrazy && cellSize >= 60) {
    ctx.fillStyle = TONGUE_COLOR;
    ctx.beginPath();
    ctx.ellipse(mouthW * 0.2, mouthY + mouthH * 0.5, mouthW * 0.3, mouthH * 0.4, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = FACE_OUTLINE;
    ctx.lineWidth = lineW * 0.6;
    ctx.stroke();
  }
}

function drawBlush(ctx, blushY, outerR, cellSize) {
  const blushSpacing = outerR * 0.55;
  const blushR = outerR * 0.10;

  ctx.fillStyle = BLUSH_COLOR;
  ctx.beginPath();
  ctx.ellipse(-blushSpacing, blushY, blushR, blushR * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(blushSpacing, blushY, blushR, blushR * 0.6, 0, 0, Math.PI * 2);
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
