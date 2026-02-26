// Glaze Rush — localStorage Wrapper
// Prefix: glazerush.v1

import { STORAGE_PREFIX, MAX_STORED_TIMES } from './constants.js';

function key(suffix) {
  return `${STORAGE_PREFIX}.${suffix}`;
}

function getJSON(k) {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setJSON(k, value) {
  localStorage.setItem(k, JSON.stringify(value));
}

// ─── Puzzle Progress ─────────────────────────────────────────

export function saveProgress(storageId, progress) {
  setJSON(key(`progress.${storageId}`), progress);
}

export function loadProgress(storageId) {
  return getJSON(key(`progress.${storageId}`));
}

export function clearProgress(storageId) {
  localStorage.removeItem(key(`progress.${storageId}`));
}

// ─── Best Times ──────────────────────────────────────────────

export function loadTimes(storageId) {
  return getJSON(key(`times.${storageId}`)) || [];
}

export function recordTime(storageId, ms) {
  const times = loadTimes(storageId);
  times.push(ms);
  times.sort((a, b) => a - b);
  if (times.length > MAX_STORED_TIMES) times.length = MAX_STORED_TIMES;
  setJSON(key(`times.${storageId}`), times);
  return times;
}

export function getBestTime(storageId) {
  const times = loadTimes(storageId);
  return times.length > 0 ? times[0] : null;
}

// ─── Last Puzzle ─────────────────────────────────────────────

export function saveLastPuzzle(meta) {
  setJSON(key('lastPuzzle'), meta);
}

export function loadLastPuzzle() {
  return getJSON(key('lastPuzzle'));
}

// ─── Completed Levels ────────────────────────────────────────

export function markCompleted(storageId) {
  const completed = getJSON(key('completed')) || {};
  completed[storageId] = true;
  setJSON(key('completed'), completed);
}

export function isCompleted(storageId) {
  const completed = getJSON(key('completed')) || {};
  return !!completed[storageId];
}

export function getCompletedCount(difficulty, size) {
  const completed = getJSON(key('completed')) || {};
  let count = 0;
  for (const k of Object.keys(completed)) {
    if (k.startsWith(`${difficulty}.${size}x${size}.`)) count++;
  }
  return count;
}

// ─── Save/Load Game State (for resume) ───────────────────────

export function saveGameState(storageId, model) {
  const rotations = {};
  for (const [k, tile] of model.tiles) {
    rotations[k] = tile.rotation;
  }
  const locked = [...model.lockedTiles];
  saveProgress(storageId, { rotations, locked, moves: model.moves });
}

export function restoreGameState(storageId, model) {
  const progress = loadProgress(storageId);
  if (!progress) return false;

  for (const [k, rotation] of Object.entries(progress.rotations)) {
    const tile = model.tiles.get(k);
    if (tile) tile.rotation = rotation;
  }

  model.lockedTiles = new Set(progress.locked || []);
  model.moves = progress.moves || 0;

  return true;
}
