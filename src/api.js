// Glaze Rush — API Client
// Adapted from Shikaku's api.js. Communicates with shared api.derpydonut.com.

const PROD_HOSTS = ['derpydonut.com', 'www.derpydonut.com'];
const PROD_API_BASE = 'https://api.derpydonut.com';

function resolveApiBase() {
  const override = localStorage.getItem('glazerush.apiBase');
  if (override) return override;
  if (PROD_HOSTS.includes(location.hostname)) return PROD_API_BASE;
  return 'http://localhost:3000';
}

function getToken() {
  return localStorage.getItem('glazerush.sessionToken') || '';
}

function setToken(token) {
  if (token) {
    localStorage.setItem('glazerush.sessionToken', token);
  } else {
    localStorage.removeItem('glazerush.sessionToken');
  }
}

async function apiFetch(path, options = {}) {
  const base = resolveApiBase();
  const url = `${base}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────

export async function login(firstName, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ firstName, password })
  });
  if (data.token) setToken(data.token);
  return data;
}

export async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch (e) {
    // ignore errors on logout
  }
  setToken(null);
}

export async function me() {
  try {
    const data = await apiFetch('/auth/me');
    return data;
  } catch (e) {
    setToken(null);
    return null;
  }
}

// ─── Scores ──────────────────────────────────────────────────

export async function submitScore(levelKey, completionMs) {
  return apiFetch('/scores', {
    method: 'POST',
    body: JSON.stringify({ levelKey, completionMs })
  });
}

// ─── Leaderboards ────────────────────────────────────────────

export async function getLeaderboard(levelKey) {
  return apiFetch(`/leaderboard/${encodeURIComponent(levelKey)}`);
}

export async function getHomeLeaderboards() {
  return apiFetch('/leaderboards/home');
}
