// Glaze Rush — Canvas Renderer
// Draws pipe tiles, donuts, source, flow animation, sprinkle particles, win FX.

import {
  PIPE_COLOR, PIPE_FLOW_COLOR, GAME_BG, SPRINKLE_COLORS,
  DONUT_BASE, DONUT_BASE_SHADOW, FROSTING_COLORS,
  PIPE_OUTLINE, PIPE_HIGHLIGHT, PIPE_FLOW_HIGHLIGHT,
  DIR_OFFSET, OPPOSITE
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
    animatingTile: null, // { key, startRotation, endRotation, startTime, duration }
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
  const maxHeight = window.innerHeight - 200; // leave room for controls

  // Compute cell size from available space
  const cellW = Math.floor(maxWidth / model.width);
  const cellH = Math.floor(maxHeight / model.height);
  let cellSize = Math.min(cellW, cellH);
  cellSize = Math.max(32, cellSize); // min 32px for touch targets, no max cap

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

  // 3. Grid lines — soft and thin
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

  // 4. Win celebration — golden pipe glow (drawn under pipes)
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

  // 6. Sprinkle particles (only on connected pipes)
  drawParticles(state, model);
}

// ─── Draw Single Tile ────────────────────────────────────────

function drawTile(ctx, tile, x, y, cellSize, inFlow, inWinCelebration, winElapsed) {
  const cx = x + cellSize / 2;
  const cy = y + cellSize / 2;
  const active = getActiveConnections(tile);
  const pipeWidth = cellSize * 0.22;
  const outerWidth = pipeWidth * 1.4;
  const highlightWidth = pipeWidth * 0.3;

  // Colors based on flow state
  const bodyColor = inFlow ? PIPE_FLOW_COLOR : PIPE_COLOR;
  const outlineColor = PIPE_OUTLINE;
  const highlightColor = inFlow ? PIPE_FLOW_HIGHLIGHT : PIPE_HIGHLIGHT;

  // Win celebration glow on flowing pipes
  if (inWinCelebration && inFlow) {
    const pulse = 0.3 + 0.3 * Math.sin(winElapsed * 6);
    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = cellSize * 0.3 * pulse;
    // Draw glow base
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = outerWidth + 4;
    ctx.lineCap = 'round';
    for (const dir of active) {
      const [dr, dc] = DIR_OFFSET[dir];
      const ex = cx + dc * (cellSize / 2);
      const ey = cy + dr * (cellSize / 2);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Layer 1: Outer stroke (dark pipe outline)
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outerWidth;
  ctx.lineCap = 'round';
  for (const dir of active) {
    const [dr, dc] = DIR_OFFSET[dir];
    const ex = cx + dc * (cellSize / 2);
    const ey = cy + dr * (cellSize / 2);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }

  // Layer 2: Pipe body (main color)
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = pipeWidth;
  ctx.lineCap = 'round';
  for (const dir of active) {
    const [dr, dc] = DIR_OFFSET[dir];
    const ex = cx + dc * (cellSize / 2);
    const ey = cy + dr * (cellSize / 2);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }

  // Layer 3: Specular highlight stripe (offset toward top-left)
  ctx.strokeStyle = highlightColor;
  ctx.lineWidth = highlightWidth;
  ctx.lineCap = 'round';
  const hlOff = pipeWidth * 0.25; // offset amount
  for (const dir of active) {
    const [dr, dc] = DIR_OFFSET[dir];
    const ex = cx + dc * (cellSize / 2);
    const ey = cy + dr * (cellSize / 2);
    // Offset perpendicular to pipe direction for 3D illusion
    let ox, oy;
    if (dc === 0) { // vertical pipe
      ox = -hlOff; oy = 0;
    } else { // horizontal pipe
      ox = 0; oy = -hlOff;
    }
    ctx.beginPath();
    ctx.moveTo(cx + ox, cy + oy);
    ctx.lineTo(ex + ox, ey + oy);
    ctx.stroke();
  }

  // Junction node — radial gradient sphere
  if (active.length > 0) {
    const junctionR = pipeWidth * 0.65;
    const grad = ctx.createRadialGradient(
      cx - junctionR * 0.3, cy - junctionR * 0.3, junctionR * 0.1,
      cx, cy, junctionR
    );
    grad.addColorStop(0, highlightColor);
    grad.addColorStop(0.6, bodyColor);
    grad.addColorStop(1, outlineColor);

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

// ─── Draw Donut ──────────────────────────────────────────────

function drawDonut(ctx, cx, cy, cellSize, style, inFlow, inWinCelebration, winElapsed) {
  const outerR = cellSize * 0.34;
  const ringWidth = cellSize * 0.14;
  const innerR = outerR - ringWidth;
  const frosting = FROSTING_COLORS[style] || FROSTING_COLORS.glazed;

  // Win celebration: pulsing scale
  let scale = 1;
  if (inWinCelebration) {
    scale = 1 + 0.08 * Math.sin(winElapsed * 8);
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Flow glow — soft pulsing shadow
  if (inFlow) {
    const glowPulse = inWinCelebration
      ? 0.6 + 0.3 * Math.sin(winElapsed * 6)
      : 0.4 + 0.15 * Math.sin(performance.now() / 400);
    ctx.shadowColor = frosting.main;
    ctx.shadowBlur = cellSize * 0.25 * glowPulse;
  }

  // Donut body — thick arc stroke (torus ring) with gradient
  // Base ring
  const bodyGrad = ctx.createRadialGradient(
    -outerR * 0.2, -outerR * 0.2, innerR * 0.5,
    0, 0, outerR * 1.1
  );
  bodyGrad.addColorStop(0, '#F0D080');
  bodyGrad.addColorStop(0.5, DONUT_BASE);
  bodyGrad.addColorStop(1, DONUT_BASE_SHADOW);

  ctx.strokeStyle = bodyGrad;
  ctx.lineWidth = ringWidth;
  ctx.beginPath();
  ctx.arc(0, 0, outerR - ringWidth / 2, 0, Math.PI * 2);
  ctx.stroke();

  // Reset shadow for frosting layers
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Donut outline (outer edge)
  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.stroke();

  // Donut outline (inner hole edge)
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.stroke();

  // Frosting overlay — top portion of donut
  const frostStart = -Math.PI * 0.85;
  const frostEnd = Math.PI * 0.85;

  ctx.strokeStyle = frosting.main;
  ctx.lineWidth = ringWidth * 0.75;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.arc(0, 0, outerR - ringWidth / 2, frostStart, frostEnd);
  ctx.stroke();

  // Frosting highlight — thinner bright arc near top
  ctx.strokeStyle = frosting.highlight;
  ctx.lineWidth = ringWidth * 0.25;
  ctx.beginPath();
  ctx.arc(0, 0, outerR - ringWidth * 0.35, -Math.PI * 0.6, Math.PI * 0.2);
  ctx.stroke();

  // Style-specific details
  if (style === 'pink_sprinkle') {
    // Scatter tiny sprinkles on the frosting
    const sprinkleColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFEAA7', '#DDA0DD', '#FF8C42'];
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
      ctx.fillStyle = sprinkleColors[i % sprinkleColors.length];
      ctx.fillRect(-cellSize * 0.025, -cellSize * 0.008, cellSize * 0.05, cellSize * 0.016);
      ctx.restore();
    }
  } else if (style === 'boston_cream') {
    // Dark chocolate cap on top
    ctx.strokeStyle = frosting.cap;
    ctx.lineWidth = ringWidth * 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, outerR - ringWidth / 2, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();
    // Shine on cap
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = ringWidth * 0.15;
    ctx.beginPath();
    ctx.arc(0, 0, outerR - ringWidth * 0.4, -Math.PI * 0.3, Math.PI * 0.1);
    ctx.stroke();
  } else if (style === 'powdered') {
    // Semi-transparent white dusting
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = ringWidth * 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, outerR - ringWidth / 2, 0, Math.PI * 2);
    ctx.stroke();
    // Speckled texture
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 / 14) * i;
      const sr = outerR - ringWidth / 2 + (Math.sin(i * 5.1) * ringWidth * 0.15);
      const sx = Math.cos(angle) * sr;
      const sy = Math.sin(angle) * sr;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(sx, sy, cellSize * 0.012, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style === 'maple') {
    // Darker streak accents on frosting
    ctx.strokeStyle = '#A0720E';
    ctx.lineWidth = ringWidth * 0.12;
    for (let i = 0; i < 3; i++) {
      const a1 = frostStart + (frostEnd - frostStart) * (0.2 + i * 0.25);
      const a2 = a1 + 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, outerR - ringWidth * (0.35 + i * 0.1), a1, a2);
      ctx.stroke();
    }
  }

  // Donut hole — inner shadow gradient for depth
  const holeGrad = ctx.createRadialGradient(
    0, 0, innerR * 0.3,
    0, 0, innerR
  );
  holeGrad.addColorStop(0, 'rgba(60, 40, 20, 0.35)');
  holeGrad.addColorStop(0.7, 'rgba(60, 40, 20, 0.1)');
  holeGrad.addColorStop(1, 'rgba(139, 105, 20, 0.25)');
  ctx.fillStyle = holeGrad;
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ─── Draw Source ─────────────────────────────────────────────

function drawSource(ctx, cx, cy, cellSize, inFlow, inWinCelebration, winElapsed) {
  const unit = cellSize * 0.07;

  ctx.save();
  ctx.translate(cx, cy);

  // Win/flow glow
  if (inFlow) {
    const glowPulse = inWinCelebration
      ? 0.6 + 0.4 * Math.sin(winElapsed * 6)
      : 0.3 + 0.15 * Math.sin(performance.now() / 500);
    ctx.shadowColor = '#FF8C42';
    ctx.shadowBlur = cellSize * 0.3 * glowPulse;
  }

  // Bowl/base — wide trapezoid
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

  // Middle tier — medium ellipse
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

  // Top tier — small circle (chocolate top)
  const topY = -unit * 2;
  const topR = unit * 2;
  const topGrad = ctx.createRadialGradient(
    -topR * 0.3, topY - topR * 0.3, topR * 0.15,
    0, topY, topR
  );
  topGrad.addColorStop(0, inFlow ? '#E8943A' : '#9B6B3A');
  topGrad.addColorStop(0.6, inFlow ? '#D2691E' : '#7B4B2A');
  topGrad.addColorStop(1, '#5C3317');

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  ctx.fillStyle = topGrad;
  ctx.beginPath();
  ctx.arc(0, topY, topR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PIPE_OUTLINE;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Highlight dot on top tier
  ctx.fillStyle = inFlow ? 'rgba(255, 220, 150, 0.6)' : 'rgba(200, 170, 120, 0.4)';
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

  // Pin head — circle
  ctx.fillStyle = '#E03030';
  ctx.strokeStyle = '#A01010';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(pinX, pinY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Highlight on pin head
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(pinX - headR * 0.25, pinY - headR * 0.25, headR * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Pin body — triangle pointing down
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

// ─── Sprinkle Particles ──────────────────────────────────────

const MAX_PARTICLES = 100;
const PARTICLE_SPEED = 60; // pixels per second

export function updateParticles(state, model, deltaMs) {
  const { particles, cellSize } = state;
  const dt = deltaMs / 1000;

  // Spawn new particles from source if in flow
  const sourceKey = coordKey(model.source.row, model.source.col);
  if (model.flowState.has(sourceKey) && model.flowState.size > 1 && particles.length < MAX_PARTICLES) {
    if (Math.random() < 0.3) {
      const sourceTile = model.tiles.get(sourceKey);
      const active = getActiveConnections(sourceTile);
      if (active.length > 0) {
        const dir = active[Math.floor(Math.random() * active.length)];
        // Random shape: 0=rect, 1=circle, 2=oval
        const shape = Math.floor(Math.random() * 3);
        const size = 2 + Math.random() * 3; // 2-5px
        const spin = Math.random() * Math.PI * 2;
        particles.push({
          x: model.source.col * cellSize + cellSize / 2,
          y: model.source.row * cellSize + cellSize / 2,
          dx: DIR_OFFSET[dir][1] * PARTICLE_SPEED,
          dy: DIR_OFFSET[dir][0] * PARTICLE_SPEED,
          color: SPRINKLE_COLORS[Math.floor(Math.random() * SPRINKLE_COLORS.length)],
          life: 1.0,
          shape,
          size,
          spin,
          spinSpeed: (Math.random() - 0.5) * 4
        });
      }
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.dx * dt;
    p.y += p.dy * dt;
    p.life -= dt * 0.5;
    p.spin += p.spinSpeed * dt;

    // Remove dead particles or out of bounds
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

    // Motion trail — faint copy behind
    ctx.globalAlpha = alpha * 0.25;
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
    // Circle
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Oval
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ─── Win Celebration ─────────────────────────────────────────

export function triggerWinCelebration(state, model) {
  state.winTime = performance.now();

  // Burst particles from all terminals — 16 per terminal
  for (const t of model.terminals) {
    const cx = t.col * state.cellSize + state.cellSize / 2;
    const cy = t.row * state.cellSize + state.cellSize / 2;
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 / 16) * i + (Math.random() - 0.5) * 0.3;
      const speed = 60 + Math.random() * 60; // faster burst
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
