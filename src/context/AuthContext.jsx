/* ─────────────────────────────────────────────────────────────────
   AuthContext  — global authentication state.

   Design decisions:
   • Owns auth state (loading / authenticated / unauthenticated) AND the
     visibility of the global auth modal (sign-in / sign-up overlay).
   • logout() does NOT navigate — user stays on the current page and the
     UI seamlessly switches to “Sign In” button in the header.
   • login() closes the modal after success; if a redirectTo is supplied
     (standalone page flow) it navigates, otherwise it stays in place.
   ───────────────────────────────────────────────────────────────── */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearToken,
  fetchProfile,
  getToken,
  loginRequest,
  signupRequest,
  setToken,
  setUserId,
  clearUserId,
  setTenantId,
  clearTenantId,
} from '../services/authService';

/* ── Status constants (use these instead of raw strings) ─────────── */
export const AUTH_STATUS = {
  LOADING:         'loading',
  AUTHENTICATED:   'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
};

/* ── Context ────────────────────────────────────────────────────── */
const AuthContext = createContext(null);

/* ── Provider ───────────────────────────────────────────────────── */
export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  const [status, setStatus] = useState(AUTH_STATUS.LOADING);
  const [user,   setUser  ] = useState(null);

  /* ── Auth modal state ───────────────────────────────────────────────── */
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab,  setAuthModalTab ] = useState('signin'); // 'signin' | 'signup'

  const openAuthModal = useCallback((tab = 'signin') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const switchAuthModalTab = useCallback((tab) => {
    setAuthModalTab(tab);
  }, []);

  // Stable ref so async login/signup callbacks can always access latest close fn
  const closeAuthModalRef = useRef(closeAuthModal);
  useEffect(() => { closeAuthModalRef.current = closeAuthModal; }, [closeAuthModal]);

  // Keep a stable navigate ref so async callbacks always use the latest.
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  /* ── Bootstrap: verify token on every page load ─────────────── */
  useEffect(() => {
    const bootstrap = async () => {
      if (!getToken()) {
        setStatus(AUTH_STATUS.UNAUTHENTICATED);
        return;
      }

      try {
        const profile = await fetchProfile();
        setUser(profile);
        setUserId(profile?.id ?? profile?._id ?? '');
        // Priority: explicit tenantId > nested tenant.id > own user id (last resort)
        const tid =
          profile?.tenantId   ??
          profile?.tenant?.id ??
          profile?.id         ??
          profile?._id        ?? '';
        console.debug('[Auth] bootstrap tenantId:', tid);
        if (tid) setTenantId(tid); // only overwrite if non-empty
        setStatus(AUTH_STATUS.AUTHENTICATED);
      } catch (err) {
        // Only wipe tokens on an explicit 401 (token genuinely invalid/expired).
        // Network errors, 500s, CORS issues, etc. must NOT clear a still-valid
        // token — otherwise any transient server hiccup on page refresh logs the
        // user out permanently until they sign in again.
        if (err?.status === 401) {
          clearToken();
          clearUserId();
          clearTenantId();
        }
        setStatus(AUTH_STATUS.UNAUTHENTICATED);
      }
    };

    bootstrap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── login ───────────────────────────────────────────────────── */
  /**
   * Authenticates the user.
   * @param {Object} credentials  - { email, password }
   * @param {string|null} [redirectTo] - navigate after success; null = stay in place
   * Closes the auth modal on success. Throws ApiError on failure.
   */
  const login = useCallback(async (credentials, redirectTo = null) => {
    const data = await loginRequest(credentials);

    // Backend returns { accessToken } — support common field name variants
    const token =
      data.accessToken ??
      data.access_token ??
      data.token ??
      data.data?.accessToken ??
      data.data?.token;

    if (!token) throw new Error('No token received from server.');
    setToken(token);

    // ── Extract tenantId ─────────────────────────────────────────
    // Priority: explicit tenantId fields first, only fall back to user.id last.
    // Original order accidentally stored user.id instead of tenantId.
    const tenantIdFromResponse =
      data.tenantId              ??   // top-level explicit field
      data.user?.tenantId        ??   // user object explicit field
      data.user?.tenant?.id      ??   // nested tenant object
      data.data?.tenantId        ??   // wrapped in data envelope
      data.data?.user?.tenantId  ??
      data.data?.user?.tenant?.id ??
      data.user?.id              ??   // fallback: user id (last resort)
      data.data?.user?.id        ??
      null;

    console.debug('[Auth] login response tenantId resolved:', tenantIdFromResponse,
      '| raw top-level tenantId:', data.tenantId,
      '| user.tenantId:', data.user?.tenantId,
      '| user.id:', data.user?.id);

    // CRITICAL: store tenantId BEFORE fetchProfile so the /user/me request
    // already has the x-tenant-id header attached by apiFetch.
    if (tenantIdFromResponse) {
      setTenantId(tenantIdFromResponse);
    }

    const profile = await fetchProfile();

    // Fallback to profile fields if login response didn't carry any id
    const resolvedTenantId =
      tenantIdFromResponse       ??
      profile?.tenantId          ??   // explicit field
      profile?.tenant?.id        ??   // nested object
      profile?.id                ??   // last resort: own user id
      profile?._id               ??
      '';

    console.debug('[Auth] resolved tenantId stored:', resolvedTenantId);
    setUserId(profile?.id ?? profile?._id ?? '');
    setTenantId(resolvedTenantId); // overwrite with most-resolved value
    setUser(profile);
    setStatus(AUTH_STATUS.AUTHENTICATED);

    // Always close the modal (no-op if it wasn't open)
    closeAuthModalRef.current();

    // Only navigate when explicitly told to (standalone sign-in page flow)
    if (redirectTo) {
      navigateRef.current(redirectTo, { replace: true });
    }
  }, []);

  /* ── signup ──────────────────────────────────────────────────── */
  /**
   * Registers a new customer.
   * @param {Object} data - { fullName, email, password, role }
   * Throws ApiError on failure (including 409 email-in-use).
   * On success from modal → switches tab to sign-in.
   * On success from standalone page → navigates to /sign-in.
   */
  const signup = useCallback(async (data, fromModal = false) => {
    await signupRequest(data);
    if (fromModal) {
      setAuthModalTab('signin');
    } else {
      navigateRef.current('/sign-in', { replace: true, state: { registered: true } });
    }
  }, []);

  /* ── logout ──────────────────────────────────────────────────── */
  /**
   * Signs the user out. Does NOT navigate — user stays on the current page.
   * The header seamlessly swaps the user menu for a “Sign In” button.
   */
  const logout = useCallback(() => {
    clearToken();
    clearUserId();
    clearTenantId();
    setUser(null);
    setStatus(AUTH_STATUS.UNAUTHENTICATED);
    // No navigation — intentional.
  }, []);

  /* ── handleResponseError ─────────────────────────────────────── */
  /**
   * Call this whenever you receive an ApiError.
   * If the status is 401 or 403 the user will be logged out automatically.
   * Returns true if the error was handled (caller should not show extra UI).
   */
  const handleResponseError = useCallback(
    (err) => {
      const errStatus = err?.status ?? err?.statusCode;
      if (errStatus === 401 || errStatus === 403) {
        // Wipe everything from localStorage
        clearToken();
        clearUserId();
        clearTenantId();
        setUser(null);
        setStatus(AUTH_STATUS.UNAUTHENTICATED);
        // Navigate to sign-in and surface a "session expired" banner
        navigateRef.current('/sign-in', {
          replace: true,
          state:   { sessionExpired: true },
        });
        return true;
      }
      return false;
    },
    [], // navigateRef is a stable ref — no dep needed
  );

  const value = {
    status,
    user,
    isLoading:         status === AUTH_STATUS.LOADING,
    isAuthenticated:   status === AUTH_STATUS.AUTHENTICATED,
    /* Auth actions */
    login,
    signup,
    logout,
    handleResponseError,
    /* Modal controls */
    authModalOpen,
    authModalTab,
    openAuthModal,
    closeAuthModal,
    switchAuthModalTab,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/* ── useAuth hook ────────────────────────────────────────────────── */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
