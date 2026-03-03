/* ─────────────────────────────────────────────────────────────────
   Auth Service — all API calls and token helpers live here.
   UI / context layers NEVER talk directly to localStorage or fetch.
   ───────────────────────────────────────────────────────────────── */

// Direct connection to the backend on port 5000 with /api prefix.
// Every backend route is mounted under /api (e.g. /api/restaurant, /api/user/me).
// In production set VITE_API_BASE_URL to your deployed API root including the /api segment
// (e.g. https://api.example.com/api).
const BASE_URL    = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const TOKEN_KEY     = 'accessToken'; // matches backend field name
const USER_ID_KEY   = 'userId';      // user's own profile id
const TENANT_ID_KEY = 'tenantId';    // sent as x-tenant-id header

/* ── Token helpers ──────────────────────────────────────────────── */
export const getToken   = ()        => localStorage.getItem(TOKEN_KEY);
export const setToken   = (token)   => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = ()        => localStorage.removeItem(TOKEN_KEY);

/* ── User-ID helpers (user's own profile id) ────────────────────── */
export const getUserId   = ()     => localStorage.getItem(USER_ID_KEY);
export const setUserId   = (id)   => localStorage.setItem(USER_ID_KEY, String(id));
export const clearUserId = ()     => localStorage.removeItem(USER_ID_KEY);

/* ── Tenant-ID helpers (sent as x-tenant-id header) ────────────── */
export const getTenantId   = ()     => localStorage.getItem(TENANT_ID_KEY);
export const setTenantId   = (id)   => localStorage.setItem(TENANT_ID_KEY, String(id));
export const clearTenantId = ()     => localStorage.removeItem(TENANT_ID_KEY);

/* ── ApiError — carries status + backend message ────────────────── */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status  = status;
    this.name    = 'ApiError';
  }
}

/* ── Generic fetch wrapper ──────────────────────────────────────── */
/**
 * Sends a fetch request to the backend.
 * Automatically attaches the Bearer token when one is stored.
 * On non-2xx: parses error body and throws ApiError(status, message).
 */
export const apiFetch = async (path, options = {}) => {
  const token    = getToken();
  const tenantId = getTenantId();

  const headers = {
    'Content-Type': 'application/json',
    ...(token    ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId ? { 'x-tenant-id': tenantId }          : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Try to parse a JSON error body { message: '...' } from the backend
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
      else if (typeof body === 'string') message = body;
    } catch (_) { /* body was not JSON */ }

    throw new ApiError(response.status, message);
  }

  return response.json();
};

/* ── Auth API calls ─────────────────────────────────────────────── */

/**
 * POST /auth/login/customer
 * Expects { accessToken, ... } back from the server.
 */
export const loginRequest = (credentials) =>
  apiFetch('/auth/login/customer', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

/**
 * POST /user/signup
 * Body: { fullName, email, password }
 * Returns the new user object on success.
 */
export const signupRequest = (data) =>
  apiFetch('/user/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  });

/**
 * GET /user/me
 * Returns the authenticated user's profile (id, fullName, email, role).
 * Token must already be stored — apiFetch attaches it as Bearer <accessToken>.
 */
export const fetchProfile = () => apiFetch('/user/me');
