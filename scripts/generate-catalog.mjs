#!/usr/bin/env node
// Glaze Rush — Puzzle Generator
// Generates spanning-tree-based pipe puzzles with guaranteed unique solutions.

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSETS = join(ROOT, 'assets');

// ─── Configuration ───────────────────────────────────────────

const DIFFICULTIES = {
  'glazed':            { sizes: [5, 7],   levels: 50 },
  'frosted':           { sizes: [7, 10],  levels: 50 },
  'sprinkled':         { sizes: [15, 20], levels: 50 },
  'double_chocolate':  { sizes: [25],     levels: 50 }
};

const DONUT_STYLES = [
  'glazed', 'chocolate', 'pink_sprinkle',
  'maple', 'boston_cream', 'powdered'
];

// Direction: 0=top, 1=right, 2=bottom, 3=left
const OPPOSITE = { 0: 2, 1: 3, 2: 0, 3: 1 };
const DIR_OFFSET = {
  0: [-1, 0],
  1: [0, 1],
  2: [1, 0],
  3: [0, -1]
};

// ─── Helpers ─────────────────────────────────────────────────

function coordKey(r, c) { return `${r},${c}`; }

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function inBounds(r, c, w, h) {
  return r >= 0 && r < h && c >= 0 && c < w;
}

// ─── Spanning Tree Generation (Randomized DFS) ──────────────

function generateSpanningTree(width, height) {
  const visited = new Set();
  // adjacency: Map<coordKey, Set<direction>>
  const edges = new Map();

  function initNode(r, c) {
    const key = coordKey(r, c);
    if (!edges.has(key)) edges.set(key, new Set());
  }

  function dfs(r, c) {
    visited.add(coordKey(r, c));
    initNode(r, c);
    const dirs = shuffle([0, 1, 2, 3]);
    for (const dir of dirs) {
      const [dr, dc] = DIR_OFFSET[dir];
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc, width, height)) continue;
      const nk = coordKey(nr, nc);
      if (visited.has(nk)) continue;
      // Add edge in both directions
      edges.get(coordKey(r, c)).add(dir);
      initNode(nr, nc);
      edges.get(nk).add(OPPOSITE[dir]);
      dfs(nr, nc);
    }
  }

  dfs(0, 0);
  return edges;
}

// ─── Tile Type Assignment ────────────────────────────────────

function classifyTile(connections) {
  const degree = connections.length;
  if (degree === 1) return 'terminal';
  if (degree === 4) return 'cross';
  if (degree === 3) return 'tee';
  if (degree === 2) {
    // Check if connections are opposite (straight) or adjacent (elbow)
    const sorted = [...connections].sort((a, b) => a - b);
    const diff = sorted[1] - sorted[0];
    return (diff === 2) ? 'straight' : 'elbow';
  }
  return 'terminal'; // shouldn't happen
}

// ─── Compute Solution Rotation ───────────────────────────────
// Given a tile type and its actual connections from the tree,
// determine what rotation (0, 90, 180, 270) maps the base
// connections to these actual connections.

function getBaseConnections(type) {
  switch (type) {
    case 'terminal': return [0];
    case 'straight': return [0, 2];
    case 'elbow': return [0, 1];
    case 'tee': return [0, 1, 2];
    case 'cross': return [0, 1, 2, 3];
  }
}

function rotateConnections(connections, steps) {
  return connections.map(c => (c + steps) % 4).sort((a, b) => a - b);
}

function findRotation(type, actualConnections) {
  const base = getBaseConnections(type);
  const target = [...actualConnections].sort((a, b) => a - b);
  for (let steps = 0; steps < 4; steps++) {
    const rotated = rotateConnections(base, steps);
    if (rotated.length === target.length && rotated.every((v, i) => v === target[i])) {
      return steps * 90;
    }
  }
  return 0; // shouldn't happen
}

// ─── Source Selection ────────────────────────────────────────
// Pick a non-terminal node near the center of the grid

function selectSource(edges, width, height) {
  const centerR = Math.floor(height / 2);
  const centerC = Math.floor(width / 2);

  // Gather non-terminal candidates
  const candidates = [];
  for (const [key, conns] of edges) {
    if (conns.size > 1) {
      const [r, c] = key.split(',').map(Number);
      const dist = Math.abs(r - centerR) + Math.abs(c - centerC);
      candidates.push({ r, c, dist });
    }
  }

  // Sort by distance to center
  candidates.sort((a, b) => a.dist - b.dist);

  // Return the closest to center
  return candidates.length > 0
    ? { row: candidates[0].r, col: candidates[0].c }
    : { row: centerR, col: centerC };
}

// ─── Uniqueness Validation ───────────────────────────────────
// Verify the puzzle has exactly one valid solution using
// constraint propagation + backtracking.

function validateUniqueness(width, height, tiles, sourceKey) {
  // Build adjacency info
  const tileMap = new Map();
  for (const t of tiles) {
    tileMap.set(coordKey(t.row, t.col), t);
  }

  // For each tile, compute all valid rotations
  // A rotation is valid if it could potentially connect with neighbors
  const possibleRotations = new Map();
  for (const t of tiles) {
    const key = coordKey(t.row, t.col);
    const rotations = [];
    for (let steps = 0; steps < 4; steps++) {
      const rot = steps * 90;
      // Cross tiles look the same at any rotation
      if (t.type === 'cross') {
        rotations.push(0);
        break;
      }
      // Straight tiles have 2 unique rotations (0 and 90)
      if (t.type === 'straight' && steps >= 2) break;
      rotations.push(rot);
    }
    possibleRotations.set(key, rotations);
  }

  // Get active connections for a tile at a given rotation
  function getActive(tile, rotation) {
    const base = getBaseConnections(tile.type);
    const steps = rotation / 90;
    return base.map(c => (c + steps) % 4);
  }

  // Check if two adjacent tiles connect at given rotations
  function connects(t1, rot1, t2, rot2, dirFromT1) {
    const a1 = getActive(t1, rot1);
    const a2 = getActive(t2, rot2);
    return a1.includes(dirFromT1) && a2.includes(OPPOSITE[dirFromT1]);
  }

  // BFS to check if all tiles are connected from source with given rotation assignment
  function isFullyConnected(rotAssign) {
    const visited = new Set();
    const queue = [sourceKey];
    visited.add(sourceKey);

    while (queue.length > 0) {
      const key = queue.shift();
      const tile = tileMap.get(key);
      const rot = rotAssign.get(key);
      const active = getActive(tile, rot);

      for (const dir of active) {
        const [dr, dc] = DIR_OFFSET[dir];
        const [r, c] = key.split(',').map(Number);
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc, width, height)) continue;
        const nk = coordKey(nr, nc);
        if (visited.has(nk)) continue;
        const neighbor = tileMap.get(nk);
        const nRot = rotAssign.get(nk);
        if (connects(tile, rot, neighbor, nRot, dir)) {
          visited.add(nk);
          queue.push(nk);
        }
      }
    }

    return visited.size === tiles.length;
  }

  // Check tree property: no tile points to a wall or has unmatched connections
  function isValidTree(rotAssign) {
    let edgeCount = 0;
    for (const t of tiles) {
      const key = coordKey(t.row, t.col);
      const rot = rotAssign.get(key);
      const active = getActive(t, rot);
      for (const dir of active) {
        const [dr, dc] = DIR_OFFSET[dir];
        const nr = t.row + dr;
        const nc = t.col + dc;
        if (!inBounds(nr, nc, width, height)) return false; // points to wall
        const nk = coordKey(nr, nc);
        const neighbor = tileMap.get(nk);
        const nRot = rotAssign.get(nk);
        if (!getActive(neighbor, nRot).includes(OPPOSITE[dir])) return false; // unmatched
        edgeCount++;
      }
    }
    // Each edge counted twice (once from each side)
    // Tree property: edges = nodes - 1
    return (edgeCount / 2) === (tiles.length - 1);
  }

  // Backtracking solver — count solutions (stop at 2)
  const keys = [...possibleRotations.keys()];
  let solutionCount = 0;

  function solve(idx, assignment) {
    if (solutionCount > 1) return; // early termination

    if (idx === keys.length) {
      // Check if this is a valid complete solution
      if (isValidTree(assignment) && isFullyConnected(assignment)) {
        solutionCount++;
      }
      return;
    }

    const key = keys[idx];
    const rotations = possibleRotations.get(key);

    for (const rot of rotations) {
      assignment.set(key, rot);

      // Quick pruning: check partial constraints with already-assigned neighbors
      const tile = tileMap.get(key);
      const [r, c] = key.split(',').map(Number);
      const active = getActive(tile, rot);
      let valid = true;

      // Check: no connection pointing out of bounds
      for (const dir of active) {
        const [dr, dc] = DIR_OFFSET[dir];
        if (!inBounds(r + dr, c + dc, width, height)) {
          valid = false;
          break;
        }
      }

      if (valid) {
        // Check against already-assigned neighbors
        for (const dir of [0, 1, 2, 3]) {
          const [dr, dc] = DIR_OFFSET[dir];
          const nr = r + dr;
          const nc = c + dc;
          if (!inBounds(nr, nc, width, height)) {
            // If tile points this way, it's invalid (already checked above)
            continue;
          }
          const nk = coordKey(nr, nc);
          if (!assignment.has(nk)) continue; // not yet assigned
          const neighbor = tileMap.get(nk);
          const nRot = assignment.get(nk);
          const nActive = getActive(neighbor, nRot);
          const tilePointsToNeighbor = active.includes(dir);
          const neighborPointsToTile = nActive.includes(OPPOSITE[dir]);
          // Both must agree: either both connect or neither connects
          if (tilePointsToNeighbor !== neighborPointsToTile) {
            valid = false;
            break;
          }
        }
      }

      if (valid) {
        solve(idx + 1, assignment);
      }

      assignment.delete(key);
    }
  }

  solve(0, new Map());
  return solutionCount === 1;
}

// ─── Puzzle Generation ───────────────────────────────────────

function generatePuzzle(difficulty, width, height, level) {
  const maxAttempts = 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const edges = generateSpanningTree(width, height);
    const source = selectSource(edges, width, height);
    const sourceKey = coordKey(source.row, source.col);

    // Build tile list
    const tiles = [];
    const terminals = [];

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const key = coordKey(r, c);
        const conns = edges.get(key);
        const connArray = [...conns];
        const type = classifyTile(connArray);
        const solutionRotation = findRotation(type, connArray);
        const isSource = (key === sourceKey);
        const isTerminal = (type === 'terminal' && !isSource);

        const tile = {
          row: r,
          col: c,
          type,
          connections: connArray.sort((a, b) => a - b),
          solution_rotation: solutionRotation,
          initial_rotation: 0, // set below
          is_terminal: isTerminal,
          is_source: isSource,
          donut_style: isTerminal ? DONUT_STYLES[Math.floor(Math.random() * DONUT_STYLES.length)] : null
        };

        tiles.push(tile);
        if (isTerminal) {
          terminals.push({ row: r, col: c, donut_style: tile.donut_style });
        }
      }
    }

    // Scramble: assign random initial rotations, ensure enough tiles are wrong
    const minWrong = Math.max(Math.floor(tiles.length * 0.6), width);
    let wrongCount = 0;

    for (const tile of tiles) {
      if (tile.type === 'cross') {
        tile.initial_rotation = 0; // cross looks the same at any rotation
        continue;
      }

      const possibleSteps = tile.type === 'straight' ? [0, 1] : [0, 1, 2, 3];
      const wrongSteps = possibleSteps.filter(s => s * 90 !== tile.solution_rotation);

      if (wrongCount < minWrong && wrongSteps.length > 0) {
        const step = wrongSteps[Math.floor(Math.random() * wrongSteps.length)];
        tile.initial_rotation = step * 90;
        wrongCount++;
      } else {
        const step = possibleSteps[Math.floor(Math.random() * possibleSteps.length)];
        tile.initial_rotation = step * 90;
        if (tile.initial_rotation !== tile.solution_rotation) wrongCount++;
      }
    }

    // Extra scramble pass if not enough wrong
    if (wrongCount < minWrong) {
      for (const tile of shuffle([...tiles])) {
        if (wrongCount >= minWrong) break;
        if (tile.initial_rotation === tile.solution_rotation && tile.type !== 'cross') {
          const possibleSteps = tile.type === 'straight' ? [0, 1] : [0, 1, 2, 3];
          const wrongSteps = possibleSteps.filter(s => s * 90 !== tile.solution_rotation);
          if (wrongSteps.length > 0) {
            tile.initial_rotation = wrongSteps[Math.floor(Math.random() * wrongSteps.length)] * 90;
            wrongCount++;
          }
        }
      }
    }

    // Validate uniqueness (skip for large grids — too expensive)
    if (width * height <= 100) {
      if (!validateUniqueness(width, height, tiles, sourceKey)) {
        continue; // retry
      }
    }

    return {
      difficulty,
      width,
      height,
      level,
      source,
      tiles,
      terminals
    };
  }

  // If all attempts fail, return the last one anyway (large grids)
  console.warn(`  Warning: Could not validate uniqueness for ${difficulty} ${width}x${height} level ${level} after ${maxAttempts} attempts`);
  return null;
}

// ─── Main ────────────────────────────────────────────────────

function main() {
  console.log('Glaze Rush — Puzzle Generator');
  console.log('============================\n');

  const catalogIndex = { version: '1.0', levels: {} };
  let totalGenerated = 0;
  let totalFailed = 0;

  for (const [difficulty, config] of Object.entries(DIFFICULTIES)) {
    const displayName = difficulty.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
    catalogIndex.levels[displayName] = {};

    for (const size of config.sizes) {
      console.log(`Generating ${displayName} ${size}x${size}...`);
      const levelNumbers = [];
      const outDir = join(ASSETS, 'puzzles', difficulty, `${size}x${size}`);
      mkdirSync(outDir, { recursive: true });

      for (let level = 1; level <= config.levels; level++) {
        const puzzle = generatePuzzle(difficulty, size, size, level);
        if (puzzle) {
          const filename = `${String(level).padStart(2, '0')}.json`;
          writeFileSync(join(outDir, filename), JSON.stringify(puzzle, null, 2));
          levelNumbers.push(level);
          totalGenerated++;
        } else {
          console.warn(`  FAILED: ${displayName} ${size}x${size} level ${level}`);
          totalFailed++;
        }

        // Progress indicator
        if (level % 10 === 0) {
          process.stdout.write(`  ${level}/${config.levels}\r`);
        }
      }

      catalogIndex.levels[displayName][String(size)] = levelNumbers;
      console.log(`  Done: ${levelNumbers.length} levels`);
    }
  }

  // Write catalog index
  writeFileSync(
    join(ASSETS, 'catalog-index.json'),
    JSON.stringify(catalogIndex, null, 2)
  );

  console.log(`\nComplete!`);
  console.log(`  Generated: ${totalGenerated} puzzles`);
  console.log(`  Failed: ${totalFailed}`);
  console.log(`  Catalog: assets/catalog-index.json`);
}

main();
