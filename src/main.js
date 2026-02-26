// Glaze Rush — App Controller
// Screen routing, input handling, timer, game lifecycle.

import { DIFFICULTIES, SIZES_BY_DIFFICULTY } from './constants.js';
import { formatMs, buildLevelKey, buildStorageId } from './utils.js';
import { createGameModel, rotateTile, undo, redo, resetPuzzle, computeFlow, toggleLock } from './game.js';
import { createRenderer, resize, render, updateParticles, cellFromPoint, triggerWinCelebration } from './renderer.js';
import { loadCatalog, getAvailableLevels, loadPuzzle } from './catalog.js';
import { saveGameState, restoreGameState, saveLastPuzzle, recordTime, getBestTime, markCompleted, isCompleted, getCompletedCount, clearProgress } from './storage.js';
import * as api from './api.js';

// ─── App State ───────────────────────────────────────────────

const state = {
  user: null,
  isGuest: false,
  catalog: null,
  currentDifficulty: 'Glazed',
  currentSize: 5,
  currentLevel: null,
  puzzle: null,
  model: null,
  renderer: null,
  timerStart: null,
  timerPaused: false,
  timerElapsed: 0,
  timerPausedAt: 0,
  timerInterval: null,
  animFrame: null,
  lastFrameTime: 0,
  longPressTimer: null
};

// ─── DOM Elements ────────────────────────────────────────────

const $ = (id) => document.getElementById(id);
const screens = document.querySelectorAll('.screen');

function showScreen(id) {
  screens.forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

// ─── Init ────────────────────────────────────────────────────

async function init() {
  // Check session
  try {
    const userData = await api.me();
    if (userData && userData.firstName) {
      state.user = userData;
      updateAuthUI();
      showScreen('home-screen');
    } else {
      showScreen('login-screen');
    }
  } catch {
    showScreen('login-screen');
  }

  // Load catalog
  try {
    state.catalog = await loadCatalog();
  } catch (e) {
    toast('Failed to load puzzle catalog');
    console.error(e);
  }

  // Setup UI
  setupDifficultySelector();
  setupEventListeners();
  loadHomeLeaderboards();
}

// ─── Auth ────────────────────────────────────────────────────

function updateAuthUI() {
  const btn = $('auth-btn');
  if (state.user) {
    btn.textContent = `${state.user.firstName} (Log Out)`;
  } else if (state.isGuest) {
    btn.textContent = 'Log In';
  } else {
    btn.textContent = 'Log In';
  }
}

async function handleLogin() {
  const name = $('login-name').value.trim();
  const password = $('login-password').value;
  if (!name || !password) return toast('Enter name and password');

  try {
    const data = await api.login(name, password);
    state.user = { firstName: data.firstName || name };
    state.isGuest = false;
    updateAuthUI();
    showScreen('home-screen');
    loadHomeLeaderboards();
  } catch (e) {
    toast('Login failed — check your credentials');
  }
}

function handleGuest() {
  state.user = null;
  state.isGuest = true;
  updateAuthUI();
  showScreen('home-screen');
}

async function handleAuthBtn() {
  if (state.user) {
    await api.logout();
    state.user = null;
    state.isGuest = false;
    updateAuthUI();
    showScreen('login-screen');
  } else {
    showScreen('login-screen');
  }
}

// ─── Difficulty / Size Selectors ─────────────────────────────

function setupDifficultySelector() {
  const diffSelect = $('difficulty-select');
  const sizeSelect = $('size-select');

  diffSelect.addEventListener('change', () => {
    state.currentDifficulty = diffSelect.value;
    updateSizeSelector();
  });

  updateSizeSelector();

  sizeSelect.addEventListener('change', () => {
    state.currentSize = parseInt(sizeSelect.value);
  });
}

function updateSizeSelector() {
  const sizeSelect = $('size-select');
  const sizes = SIZES_BY_DIFFICULTY[state.currentDifficulty] || [];
  sizeSelect.innerHTML = '';
  for (const s of sizes) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = `${s}×${s}`;
    sizeSelect.appendChild(opt);
  }
  state.currentSize = sizes[0] || 5;
}

// ─── Home Leaderboards ───────────────────────────────────────

async function loadHomeLeaderboards() {
  try {
    const data = await api.getHomeLeaderboards();
    renderHomeLeaderboard('home-donuts-list', data.donuts || []);
    renderHomeLeaderboard('home-sprinkles-list', data.sprinkles || []);
  } catch {
    // silent fail for leaderboards
  }
}

function renderHomeLeaderboard(elementId, entries) {
  const ol = $(elementId);
  ol.innerHTML = '';
  const top = entries.slice(0, 10);
  for (const entry of top) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="rank-name">${entry.firstName || entry.name || '?'}</span>
                    <span class="rank-value">${entry.count ?? entry.value ?? ''}</span>`;
    ol.appendChild(li);
  }
  if (top.length === 0) {
    ol.innerHTML = '<li style="color:var(--ink-light)">No scores yet</li>';
  }
}

// ─── Start Button ───────────────────────────────────────────

function handleStart() {
  if (!state.catalog) return toast('Catalog not loaded');
  const diff = state.currentDifficulty;
  const size = state.currentSize;
  const levels = getAvailableLevels(state.catalog, diff, size);
  if (levels.length === 0) return toast('No levels available');

  // Find uncompleted levels
  const uncompleted = levels.filter(l => {
    const sid = buildStorageId(diff, size, size, l);
    return !isCompleted(sid);
  });

  // Pick random from uncompleted, or random from all if all completed
  const pool = uncompleted.length > 0 ? uncompleted : levels;
  const level = pool[Math.floor(Math.random() * pool.length)];
  startPuzzle(diff, size, level);
}

// ─── Levels Screen ───────────────────────────────────────────

function showLevels() {
  if (!state.catalog) return toast('Catalog not loaded');

  const diff = state.currentDifficulty;
  const size = state.currentSize;
  const levels = getAvailableLevels(state.catalog, diff, size);

  $('levels-title').textContent = `${diff} ${size}×${size}`;
  const completed = getCompletedCount(diff, size);
  $('levels-subtitle').textContent = `${completed}/${levels.length} completed`;

  const grid = $('level-grid');
  grid.innerHTML = '';

  for (const level of levels) {
    const btn = document.createElement('button');
    btn.className = 'level-btn';
    btn.textContent = level;
    const sid = buildStorageId(diff, size, size, level);
    if (isCompleted(sid)) btn.classList.add('completed');
    btn.addEventListener('click', () => startPuzzle(diff, size, level));
    grid.appendChild(btn);
  }

  showScreen('levels-screen');
}

// ─── Start Puzzle ────────────────────────────────────────────

async function startPuzzle(difficulty, size, level) {
  try {
    const puzzle = await loadPuzzle(difficulty, size, level);
    state.puzzle = puzzle;
    state.currentDifficulty = difficulty;
    state.currentSize = size;
    state.currentLevel = level;

    // Create game model
    const model = createGameModel(puzzle);
    state.model = model;

    // Try to restore saved progress
    const storageId = buildStorageId(difficulty, size, size, level);
    const restored = restoreGameState(storageId, model);
    if (restored) {
      model.flowState = computeFlow(model);
    }

    // Save as last puzzle
    saveLastPuzzle({ difficulty, size, level });

    // UI — show screen FIRST so container has layout dimensions
    $('puzzle-info').textContent = `${difficulty} ${size}×${size} #${level}`;
    $('moves').textContent = `${model.moves} moves`;
    showScreen('puzzle-screen');

    // Setup canvas (after screen is visible so resize reads correct container width)
    const canvas = $('game-canvas');
    state.renderer = createRenderer(canvas, model);

    // Reset timer
    stopTimer();
    state.timerStart = null;
    state.timerElapsed = 0;
    state.timerPaused = false;
    $('timer').textContent = '00:00.00';

    // If restored with moves, start timer immediately
    if (restored && model.moves > 0) {
      startTimer();
    }

    // Load level leaderboard
    loadPuzzleLeaderboard(difficulty, size, level);

    // Start render loop
    startRenderLoop();

    // Render initial state
    render(state.renderer, model);
  } catch (e) {
    toast('Failed to load puzzle');
    console.error(e);
  }
}

// ─── Render Loop ─────────────────────────────────────────────

function startRenderLoop() {
  if (state.animFrame) cancelAnimationFrame(state.animFrame);
  state.lastFrameTime = performance.now();

  function loop(now) {
    const dt = now - state.lastFrameTime;
    state.lastFrameTime = now;

    if (state.model && state.renderer) {
      updateParticles(state.renderer, state.model, dt);
      render(state.renderer, state.model);
    }

    state.animFrame = requestAnimationFrame(loop);
  }

  state.animFrame = requestAnimationFrame(loop);
}

function stopRenderLoop() {
  if (state.animFrame) {
    cancelAnimationFrame(state.animFrame);
    state.animFrame = null;
  }
}

// ─── Timer ───────────────────────────────────────────────────

function startTimer() {
  if (state.timerStart !== null) return;
  state.timerStart = performance.now();
  state.timerInterval = setInterval(updateTimerDisplay, 50);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  if (state.timerStart !== null) {
    state.timerElapsed += performance.now() - state.timerStart;
    state.timerStart = null;
  }
}

function pauseTimer() {
  if (state.timerStart !== null) {
    state.timerElapsed += performance.now() - state.timerStart;
    state.timerStart = null;
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
    state.timerPaused = true;
  }
}

function resumeTimer() {
  if (state.timerPaused && state.timerElapsed > 0) {
    state.timerStart = performance.now();
    state.timerInterval = setInterval(updateTimerDisplay, 50);
    state.timerPaused = false;
  }
}

function getElapsedMs() {
  let total = state.timerElapsed;
  if (state.timerStart !== null) {
    total += performance.now() - state.timerStart;
  }
  return total;
}

function updateTimerDisplay() {
  $('timer').textContent = formatMs(getElapsedMs());
}

// ─── Canvas Input ────────────────────────────────────────────

function setupCanvasInput() {
  const canvas = $('game-canvas');

  // Click — rotate CW
  canvas.addEventListener('click', (e) => {
    if (!state.model || state.model.solved) return;
    const cell = cellFromPoint(state.renderer, state.model, e.clientX, e.clientY);
    if (!cell) return;

    // Start timer on first interaction
    startTimer();

    const direction = e.ctrlKey || e.metaKey ? -1 : 1;
    const result = rotateTile(state.model, cell.row, cell.col, direction);

    if (result.ok) {
      $('moves').textContent = `${state.model.moves} moves`;
      saveGameState(
        buildStorageId(state.currentDifficulty, state.currentSize, state.currentSize, state.currentLevel),
        state.model
      );

      if (result.solved) {
        handleWin();
      }
    }
  });

  // Right-click — toggle lock
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!state.model || state.model.solved) return;
    const cell = cellFromPoint(state.renderer, state.model, e.clientX, e.clientY);
    if (!cell) return;

    toggleLock(state.model, cell.row, cell.col);
  });

  // Touch — rotate CW, long press = lock
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!state.model || state.model.solved) return;
    const touch = e.touches[0];
    const cell = cellFromPoint(state.renderer, state.model, touch.clientX, touch.clientY);
    if (!cell) return;

    state.longPressTimer = setTimeout(() => {
      // Long press = toggle lock
      const key = `${cell.row},${cell.col}`;
      if (state.model.lockedTiles.has(key)) {
        state.model.lockedTiles.delete(key);
      } else {
        state.model.lockedTiles.add(key);
      }
      state.longPressTimer = null;
    }, 500);
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;

      // Short tap = rotate CW
      if (!state.model || state.model.solved) return;
      const touch = e.changedTouches[0];
      const cell = cellFromPoint(state.renderer, state.model, touch.clientX, touch.clientY);
      if (!cell) return;

      startTimer();
      const result = rotateTile(state.model, cell.row, cell.col, 1);
      if (result.ok) {
        $('moves').textContent = `${state.model.moves} moves`;
        saveGameState(
          buildStorageId(state.currentDifficulty, state.currentSize, state.currentSize, state.currentLevel),
          state.model
        );
        if (result.solved) handleWin();
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', () => {
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
  });
}

// ─── Win ─────────────────────────────────────────────────────

function handleWin() {
  stopTimer();
  const elapsedMs = getElapsedMs();
  const storageId = buildStorageId(state.currentDifficulty, state.currentSize, state.currentSize, state.currentLevel);

  // Record time
  recordTime(storageId, elapsedMs);
  markCompleted(storageId);
  clearProgress(storageId);

  // Win celebration
  triggerWinCelebration(state.renderer, state.model);

  // Show solved modal
  const bestTime = getBestTime(storageId);
  $('solved-time').textContent = formatMs(elapsedMs);
  $('solved-best').textContent = bestTime ? `Best: ${formatMs(bestTime)}` : '';
  $('solved-moves').textContent = `${state.model.moves} moves`;

  // Show login prompt if guest
  $('solved-login-prompt').style.display = (state.isGuest && !state.user) ? '' : 'none';

  // Submit score if logged in
  if (state.user) {
    const levelKey = buildLevelKey(state.currentDifficulty, state.currentSize, state.currentSize, state.currentLevel);
    api.submitScore(levelKey, Math.round(elapsedMs)).catch(() => {
      toast('Score saved locally (API unavailable)');
    });
  }

  // Show modal with slight delay for celebration
  setTimeout(() => {
    $('solved-modal').classList.add('active');
  }, 800);
}

// ─── Puzzle Leaderboard ──────────────────────────────────────

async function loadPuzzleLeaderboard(difficulty, size, level) {
  const levelKey = buildLevelKey(difficulty, size, size, level);
  const tbody = $('puzzle-lb-body');
  tbody.innerHTML = '<tr><td colspan="3" style="color:var(--ink-light)">Loading...</td></tr>';

  try {
    const data = await api.getLeaderboard(levelKey);
    tbody.innerHTML = '';
    const entries = data.leaderboard || data.entries || data || [];
    if (!Array.isArray(entries) || entries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="color:var(--ink-light)">No scores yet</td></tr>';
      return;
    }
    entries.slice(0, 15).forEach((entry, i) => {
      const tr = document.createElement('tr');
      if (state.user && entry.firstName === state.user.firstName) tr.classList.add('highlight');
      tr.innerHTML = `<td>${i + 1}</td><td>${entry.firstName || '?'}</td><td>${formatMs(entry.bestMs || entry.completionMs || 0)}</td>`;
      tbody.appendChild(tr);
    });
  } catch {
    tbody.innerHTML = '<tr><td colspan="3" style="color:var(--ink-light)">Unavailable</td></tr>';
  }
}

// ─── Event Listeners ─────────────────────────────────────────

function setupEventListeners() {
  // Login
  $('login-btn').addEventListener('click', handleLogin);
  $('login-password').addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });
  $('guest-btn').addEventListener('click', handleGuest);
  $('auth-btn').addEventListener('click', handleAuthBtn);

  // Home
  $('start-btn').addEventListener('click', handleStart);
  $('select-level-btn').addEventListener('click', showLevels);

  // Levels
  $('levels-back-btn').addEventListener('click', () => showScreen('home-screen'));

  // Puzzle controls
  $('undo-btn').addEventListener('click', () => {
    if (state.model && undo(state.model)) {
      $('moves').textContent = `${state.model.moves} moves`;
    }
  });
  $('redo-btn').addEventListener('click', () => {
    if (state.model && redo(state.model)) {
      $('moves').textContent = `${state.model.moves} moves`;
    }
  });
  $('restart-btn').addEventListener('click', () => {
    if (state.model && state.puzzle) {
      resetPuzzle(state.model, state.puzzle);
      $('moves').textContent = '0 moves';
      stopTimer();
      state.timerStart = null;
      state.timerElapsed = 0;
      $('timer').textContent = '00:00.00';
      clearProgress(buildStorageId(state.currentDifficulty, state.currentSize, state.currentSize, state.currentLevel));
    }
  });
  $('puzzle-back-btn').addEventListener('click', () => {
    stopRenderLoop();
    stopTimer();
    showScreen('home-screen');
  });

  // Solved modal
  $('next-level-btn').addEventListener('click', () => {
    $('solved-modal').classList.remove('active');
    const nextLevel = state.currentLevel + 1;
    const levels = getAvailableLevels(state.catalog, state.currentDifficulty, state.currentSize);
    if (levels.includes(nextLevel)) {
      startPuzzle(state.currentDifficulty, state.currentSize, nextLevel);
    } else {
      showScreen('home-screen');
      toast('All levels in this set completed!');
    }
  });
  $('replay-btn').addEventListener('click', () => {
    $('solved-modal').classList.remove('active');
    startPuzzle(state.currentDifficulty, state.currentSize, state.currentLevel);
  });
  $('solved-back-btn').addEventListener('click', () => {
    $('solved-modal').classList.remove('active');
    stopRenderLoop();
    showScreen('home-screen');
  });

  // Canvas input
  setupCanvasInput();

  // Pause timer on tab blur
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  });

  // Resize
  window.addEventListener('resize', () => {
    if (state.model && state.renderer) {
      resize(state.renderer, state.model);
      render(state.renderer, state.model);
    }
  });
}

// ─── Toast ───────────────────────────────────────────────────

function toast(msg) {
  const container = $('toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ─── Boot ────────────────────────────────────────────────────

init();
