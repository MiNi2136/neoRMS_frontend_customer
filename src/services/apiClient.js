/* ─────────────────────────────────────────────────────────────────
   apiClient — centralized Axios instance.

   Every outgoing request automatically receives:
     Authorization: Bearer <auth_token>   (if present in localStorage)
     x-tenant-id:   <tenantId>            (if present in localStorage)

   No component or service function ever needs to attach these manually.
   ───────────────────────────────────────────────────────────────── */

import axios from 'axios';
import { ApiError } from './authService';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/* localStorage keys — must match authService.js constants */
const TOKEN_KEY     = 'accessToken'; // matches backend field + authService.js
const TENANT_ID_KEY = 'tenantId';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

/* ── Request interceptor ─────────────────────────────────────────── */
apiClient.interceptors.request.use((config) => {
  const token    = localStorage.getItem(TOKEN_KEY);
  const tenantId = localStorage.getItem(TENANT_ID_KEY);

  if (token)    config.headers['Authorization'] = `Bearer ${token}`;
  if (tenantId) config.headers['x-tenant-id']  = tenantId;
  // Debug: log outgoing headers in development so header issues are instantly visible
  if (import.meta.env.DEV) {
    console.debug(
      `[API] ${config.method?.toUpperCase()} ${config.url}`,
      '| token:', token ? '✅ present' : '❌ MISSING',
      '| tenantId:', tenantId ?? '❌ MISSING',
    );
  }
  return config;
});

/* ── Response interceptor ────────────────────────────────────────── */
// Unwrap Axios envelope so callers receive `data` directly (same as apiFetch).
// On error: normalize into an object with .status and .name = 'ApiError'
// so existing ApiError checks (instanceof / .status comparisons) still work.
apiClient.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status  = err.response?.status ?? 0;
    const raw     =
      err.response?.data?.message ??
      err.response?.data ??
      err.message ??
      'Request failed';
    const message = typeof raw === 'string' ? raw : JSON.stringify(raw);

    // Throw a real ApiError instance so `instanceof ApiError` checks work
    return Promise.reject(new ApiError(status, message));
  },
);

export default apiClient;
