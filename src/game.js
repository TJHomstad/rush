// Glaze Rush — Game Model
// Pure game logic: state management, tile rotation, BFS flow, win detection, undo/redo.
// No DOM, no rendering.

import { OPPOSITE, DIR_OFFSET, BASE_CONNECTIONS } from './constants.js';
import { coordKey, inBounds } from './utils.js';

// ─── Game Model Creation ─────────────────────────────────────

export function createGameModel(puzzle) {
  const { width, height, source, tiles: puzzleTiles, terminals } = puzzle;

  const tiles = new Map();
  const terminalList = [];
  const sourcePos = { row: source.row, col: source.col };

  for (const pt of puzzleTiles) {
    const key = coordKey(pt.row, pt.col);
    const tile = {
      row: pt.row,
      col: pt.col,
      type: pt.type,
      baseConnections: [...pt.connections],
      rotation: pt.initial_rotation,
      isTerminal: pt.is_terminal,
      isSource: pt.is_source,
      donutStyle: pt.donut_style || null
    };
    tiles.set(key, tile);
    if (tile.isTerminal) {
      terminalList.push({ row: pt.row, col: pt.col, donutStyle: tile.donutStyle });
    }
  }

  const model = {
    width,
    height,
    tiles,
    source: sourcePos,
    terminals: terminalList,
    flowState: new Set(),
    moves: 0,
    solved: false,
    history: [],
    redoHistory: [],
    lockedTiles: new Set()
  };

  // Compute initial flow
  model.flowState = computeFlow(model);

  return model;
}

// ─── Active Connections ──────────────────────────────────────

export function getActiveConnections(tile) {
  const steps = tile.rotation / 90;
  return tile.baseConnections.map(c => (c + steps) % 4);
}

// ─── Connection Matching ─────────────────────────────────────

export function tilesConnect(model, r1, c1, r2, c2) {
  const key1 = coordKey(r1, c1);
  const key2 = coordKey(r2, c2);
  const tile1 = model.tiles.get(key1);
  const tile2 = model.tiles.get(key2);
  if (!tile1 || !tile2) return false;

  // Determine direction from tile1 to tile2
  const dr = r2 - r1;
  const dc = c2 - c1;
  let dirFromT1 = -1;
  for (const [dir, [odr, odc]] of Object.entries(DIR_OFFSET)) {
    if (odr === dr && odc === dc) {
      dirFromT1 = Number(dir);
      break;
    }
  }
  if (dirFromT1 === -1) return false; // not adjacent

  const active1 = getActiveConnections(tile1);
  const active2 = getActiveConnections(tile2);

  return active1.includes(dirFromT1) && active2.includes(OPPOSITE[dirFromT1]);
}

// ─── BFS Flow Computation ────────────────────────────────────

export function computeFlow(model) {
  const { width, height, source, tiles } = model;
  const flow = new Set();
  const sourceKey = coordKey(source.row, source.col);
  const queue = [sourceKey];
  flow.add(sourceKey);

  while (queue.length > 0) {
    const key = queue.shift();
    const [r, c] = key.split(',').map(Number);
    const tile = tiles.get(key);
    const active = getActiveConnections(tile);

    for (const dir of active) {
      const [dr, dc] = DIR_OFFSET[dir];
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc, width, height)) continue;
      const nk = coordKey(nr, nc);
      if (flow.has(nk)) continue;

      const neighbor = tiles.get(nk);
      const neighborActive = getActiveConnections(neighbor);

      // Both tiles must point toward each other
      if (neighborActive.includes(OPPOSITE[dir])) {
        flow.add(nk);
        queue.push(nk);
      }
    }
  }

  return flow;
}

// ─── Win Detection ───────────────────────────────────────────

export function isSolved(model) {
  const { terminals, flowState, tiles, width, height } = model;

  // All terminals must be in flow
  for (const t of terminals) {
    if (!flowState.has(coordKey(t.row, t.col))) return false;
  }

  // Tree property: count edges in flow, must equal flowState.size - 1
  let edgeCount = 0;
  for (const key of flowState) {
    const [r, c] = key.split(',').map(Number);
    const tile = tiles.get(key);
    const active = getActiveConnections(tile);

    for (const dir of active) {
      const [dr, dc] = DIR_OFFSET[dir];
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc, width, height)) continue;
      const nk = coordKey(nr, nc);
      if (!flowState.has(nk)) continue;

      const neighbor = tiles.get(nk);
      const neighborActive = getActiveConnections(neighbor);
      if (neighborActive.includes(OPPOSITE[dir])) {
        edgeCount++;
      }
    }
  }

  // Each edge counted twice
  return (edgeCount / 2) === (flowState.size - 1);
}

// ─── Tile Rotation ───────────────────────────────────────────

export function rotateTile(model, row, col, direction) {
  const key = coordKey(row, col);

  if (model.lockedTiles.has(key)) {
    return { ok: false, reason: 'locked' };
  }

  if (model.solved) {
    return { ok: false, reason: 'solved' };
  }

  const tile = model.tiles.get(key);
  if (!tile) {
    return { ok: false, reason: 'no tile' };
  }

  // Save undo snapshot
  const snapshot = createSnapshot(model);
  model.history.push(snapshot);
  model.redoHistory = []; // clear redo on new action

  // Rotate: direction = 1 for CW, -1 for CCW
  const delta = direction > 0 ? 90 : -90;
  tile.rotation = ((tile.rotation + delta) % 360 + 360) % 360;

  model.moves++;

  // Recompute flow
  model.flowState = computeFlow(model);

  // Check win
  if (isSolved(model)) {
    model.solved = true;
  }

  return { ok: true, solved: model.solved };
}

// ─── Tile Locking ────────────────────────────────────────────

export function toggleLock(model, row, col) {
  const key = coordKey(row, col);
  if (!model.tiles.has(key)) return;

  if (model.lockedTiles.has(key)) {
    model.lockedTiles.delete(key);
  } else {
    model.lockedTiles.add(key);
  }
}

// ─── Undo / Redo ─────────────────────────────────────────────

function createSnapshot(model) {
  const tileRotations = new Map();
  for (const [key, tile] of model.tiles) {
    tileRotations.set(key, tile.rotation);
  }
  return {
    tileRotations,
    lockedTiles: new Set(model.lockedTiles),
    moves: model.moves,
    solved: model.solved
  };
}

function applySnapshot(model, snapshot) {
  for (const [key, rotation] of snapshot.tileRotations) {
    model.tiles.get(key).rotation = rotation;
  }
  model.lockedTiles = new Set(snapshot.lockedTiles);
  model.moves = snapshot.moves;
  model.solved = snapshot.solved;
  model.flowState = computeFlow(model);
}

export function undo(model) {
  if (model.history.length === 0) return false;

  // Save current state for redo
  const currentSnapshot = createSnapshot(model);
  model.redoHistory.push(currentSnapshot);

  // Restore previous state
  const snapshot = model.history.pop();
  applySnapshot(model, snapshot);

  return true;
}

export function redo(model) {
  if (model.redoHistory.length === 0) return false;

  // Save current state for undo
  const currentSnapshot = createSnapshot(model);
  model.history.push(currentSnapshot);

  // Restore redo state
  const snapshot = model.redoHistory.pop();
  applySnapshot(model, snapshot);

  return true;
}

// ─── Reset ───────────────────────────────────────────────────

export function resetPuzzle(model, puzzle) {
  // Save undo snapshot before reset
  const snapshot = createSnapshot(model);
  model.history.push(snapshot);
  model.redoHistory = [];

  // Restore initial rotations
  for (const pt of puzzle.tiles) {
    const key = coordKey(pt.row, pt.col);
    const tile = model.tiles.get(key);
    if (tile) {
      tile.rotation = pt.initial_rotation;
    }
  }

  model.moves = 0;
  model.solved = false;
  model.lockedTiles.clear();
  model.flowState = computeFlow(model);
}
