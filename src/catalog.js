// Glaze Rush — Puzzle Catalog Loader & Validator

let catalogCache = null;

// ─── Load Catalog Index ──────────────────────────────────────

export async function loadCatalog() {
  if (catalogCache) return catalogCache;

  const res = await fetch('assets/catalog-index.json');
  if (!res.ok) throw new Error(`Failed to load catalog: ${res.status}`);
  catalogCache = await res.json();
  return catalogCache;
}

// ─── Get Available Levels ────────────────────────────────────

export function getAvailableLevels(catalog, difficulty, size) {
  const diffLevels = catalog.levels[difficulty];
  if (!diffLevels) return [];
  return diffLevels[String(size)] || [];
}

// ─── Load Single Puzzle ──────────────────────────────────────

export async function loadPuzzle(difficulty, size, level) {
  const diffKey = difficulty.toLowerCase().replace(/ /g, '_');
  const levelPad = String(level).padStart(2, '0');
  const path = `assets/puzzles/${diffKey}/${size}x${size}/${levelPad}.json`;

  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load puzzle: ${path} (${res.status})`);
  const puzzle = await res.json();

  validatePuzzle(puzzle);
  return puzzle;
}

// ─── Validate Puzzle JSON ────────────────────────────────────

function validatePuzzle(puzzle) {
  if (!puzzle.width || !puzzle.height) throw new Error('Missing width/height');
  if (!puzzle.source) throw new Error('Missing source');
  if (!Array.isArray(puzzle.tiles) || puzzle.tiles.length === 0) throw new Error('Missing tiles');

  const expectedTiles = puzzle.width * puzzle.height;
  if (puzzle.tiles.length !== expectedTiles) {
    throw new Error(`Expected ${expectedTiles} tiles, got ${puzzle.tiles.length}`);
  }

  for (const tile of puzzle.tiles) {
    if (tile.row < 0 || tile.row >= puzzle.height) throw new Error(`Tile row out of bounds: ${tile.row}`);
    if (tile.col < 0 || tile.col >= puzzle.width) throw new Error(`Tile col out of bounds: ${tile.col}`);
    if (!tile.type) throw new Error(`Tile missing type at ${tile.row},${tile.col}`);
    if (!Array.isArray(tile.connections)) throw new Error(`Tile missing connections at ${tile.row},${tile.col}`);
  }
}

// ─── Catalog Summary ─────────────────────────────────────────

export function catalogSummary(catalog) {
  let total = 0;
  for (const diff of Object.values(catalog.levels)) {
    for (const levels of Object.values(diff)) {
      total += levels.length;
    }
  }
  return total;
}
