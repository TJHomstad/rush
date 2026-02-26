// Glaze Rush — Canvas Renderer
// Draws pipe tiles, donuts, source, flow animation, sprinkle particles, win FX.

import {
  PIPE_COLOR, PIPE_FLOW_COLOR, GAME_BG, SPRINKLE_COLORS,
  DONUT_COLORS, DIR_OFFSET, OPPOSITE
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

  // 2. Grid lines
  ctx.strokeStyle = '#E8E0D4';
  ctx.lineWidth = 1;
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

  // 3. Tiles (pipes, donuts, source)
  for (const [key, tile] of model.tiles) {
    const x = tile.col * cellSize;
    const y = tile.row * cellSize;
    const inFlow = model.flowState.has(key);

    drawTile(ctx, tile, x, y, cellSize, inFlow);

    // Lock indicator
    if (model.lockedTiles.has(key)) {
      drawLockIndicator(ctx, x, y, cellSize);
    }
  }

  // 4. Sprinkle particles (only on connected pipes)
  drawParticles(state, model);

  // 5. Hover highlight (handled by CSS cursor, not drawn)
}

// ─── Draw Single Tile ────────────────────────────────────────

function drawTile(ctx, tile, x, y, cellSize, inFlow) {
  const cx = x + cellSize / 2;
  const cy = y + cellSize / 2;
  const active = getActiveConnections(tile);
  const pipeWidth = cellSize * 0.22;
  const pipeColor = inFlow ? PIPE_FLOW_COLOR : PIPE_COLOR;

  // Draw pipe segments from center to edges
  ctx.strokeStyle = pipeColor;
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

  // Draw center junction dot
  ctx.fillStyle = pipeColor;
  ctx.beginPath();
  ctx.arc(cx, cy, pipeWidth * 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Draw terminal (donut) or source
  if (tile.isTerminal) {
    drawDonut(ctx, cx, cy, cellSize, tile.donutStyle, inFlow);
  } else if (tile.isSource) {
    drawSource(ctx, cx, cy, cellSize, inFlow);
  }
}

// ─── Draw Donut ──────────────────────────────────────────────

function drawDonut(ctx, cx, cy, cellSize, style, inFlow) {
  const outerR = cellSize * 0.32;
  const innerR = cellSize * 0.1;
  const color = DONUT_COLORS[style] || '#F4C430';

  // Outer donut
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.fill();

  // Donut hole
  ctx.fillStyle = GAME_BG;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fill();

  // Glow when in flow
  if (inFlow) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Donut outline
  ctx.strokeStyle = '#3A2010';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.stroke();
}

// ─── Draw Source ─────────────────────────────────────────────

function drawSource(ctx, cx, cy, cellSize, inFlow) {
  const size = cellSize * 0.28;

  // Diamond shape
  ctx.fillStyle = inFlow ? '#FF6B35' : '#D2691E';
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size, cy);
  ctx.closePath();
  ctx.fill();

  // Outline
  ctx.strokeStyle = '#3A2010';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner dot
  ctx.fillStyle = '#FFF8F0';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Lock Indicator ──────────────────────────────────────────

function drawLockIndicator(ctx, x, y, cellSize) {
  const dotR = cellSize * 0.06;
  const px = x + cellSize - dotR * 2.5;
  const py = y + dotR * 2.5;

  ctx.fillStyle = '#FF4444';
  ctx.beginPath();
  ctx.arc(px, py, dotR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#AA0000';
  ctx.lineWidth = 1;
  ctx.stroke();
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
        particles.push({
          x: model.source.col * cellSize + cellSize / 2,
          y: model.source.row * cellSize + cellSize / 2,
          dx: DIR_OFFSET[dir][1] * PARTICLE_SPEED,
          dy: DIR_OFFSET[dir][0] * PARTICLE_SPEED,
          color: SPRINKLE_COLORS[Math.floor(Math.random() * SPRINKLE_COLORS.length)],
          life: 1.0
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
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 2, p.y - 1, 4, 2);
  }
  ctx.globalAlpha = 1;
}

// ─── Win Celebration ─────────────────────────────────────────

export function triggerWinCelebration(state, model) {
  state.winTime = performance.now();

  // Burst particles from all terminals
  for (const t of model.terminals) {
    const cx = t.col * state.cellSize + state.cellSize / 2;
    const cy = t.row * state.cellSize + state.cellSize / 2;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i;
      state.particles.push({
        x: cx,
        y: cy,
        dx: Math.cos(angle) * 80,
        dy: Math.sin(angle) * 80,
        color: SPRINKLE_COLORS[Math.floor(Math.random() * SPRINKLE_COLORS.length)],
        life: 1.5
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
