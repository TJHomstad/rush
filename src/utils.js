// Glaze Rush — Utility Functions

/**
 * Format milliseconds as mm:ss.ms
 */
export function formatMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(2, '0')}`;
}

/**
 * Create a coordinate key string from row and col
 */
export function coordKey(row, col) {
  return `${row},${col}`;
}

/**
 * Parse a coordinate key string back to {row, col}
 */
export function parseCoordKey(key) {
  const [row, col] = key.split(',').map(Number);
  return { row, col };
}

/**
 * Check if coordinates are within grid bounds
 */
export function inBounds(row, col, width, height) {
  return row >= 0 && row < height && col >= 0 && col < width;
}

/**
 * Build a level key for API score submission
 * Format: glazerush.{difficulty}.{width}x{height}.{level_padded}
 */
export function buildLevelKey(difficulty, width, height, level) {
  const diffKey = difficulty.toLowerCase().replace(/ /g, '_');
  const levelPad = String(level).padStart(2, '0');
  return `glazerush.${diffKey}.${width}x${height}.${levelPad}`;
}

/**
 * Build a storage ID for localStorage
 * Format: {difficulty}.{width}x{height}.{level}
 */
export function buildStorageId(difficulty, width, height, level) {
  return `${difficulty}.${width}x${height}.${level}`;
}

/**
 * Shuffle an array in place using Fisher-Yates
 */
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pick a random element from an array
 */
export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Clamp a number between min and max
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
