/* ─────────────────────────────────────────────────────────────────
   SignInPage — customer login form.

   Rules enforced here:
   • No email-existence check on the frontend (backend is the source of truth).
   • After login, redirect the user back to wherever they came from.
   • Shows the exact backend error message so users know what went wrong.
   ───────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Utensils } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/* ── Theme ── */
const C = {
  primary:      '#E63946',
  primaryHover: '#C0252E',
  dark:         '#1F2937',
  gray:         '#6B7280',
  border:       '#E5E7EB',
  error:        '#EF4444',
  bg:           '#F9FAFB',
};

const SignInPage = () => {
  const { login }  = useAuth();
  const location   = useLocation();

  /* After login, send the user back to where they came from (or home) */
  const from = location.state?.from?.pathname ?? '/';

  const [form,      setForm     ] = useState({ email: '', password: '' });
  const [showPass,  setShowPass ] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError    ] = useState('');

  /* Show a green banner when the user just registered */
  const justRegistered  = location.state?.registered     === true;
  /* Show an amber banner when the session expired mid-use */
  const sessionExpired  = location.state?.sessionExpired === true;

  const handleChange = (e) => {
    setError('');
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      /* login() calls POST /auth/login/customer, stores token, fetches profile */
      await login({ email: form.email, password: form.password }, from);
    } catch (err) {
      // err is an ApiError with .status and .message from the backend
      const status = err?.status;
      if (status === 401 || status === 400) {
        setError(err.message || 'Invalid email or password. Please try again.');
      } else if (status === 422) {
        setError(err.message || 'Please check your email format and try again.');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight:      'calc(100vh - 80px)',
        backgroundColor: C.bg,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '24px 16px',
      }}
    >
      <style>{`
        .si-input {
          width: 100%; padding: 11px 14px;
          border: 1.5px solid ${C.border}; border-radius: 10px;
          font-size: 15px; color: ${C.dark}; background: #fff;
          outline: none; transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .si-input:focus { border-color: ${C.primary}; }
        .si-input.si-error { border-color: ${C.error}; }
        .si-btn-primary {
          width: 100%; padding: 12px;
          background: ${C.primary}; color: #fff;
          border: none; border-radius: 10px;
          font-size: 16px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 8px;
          transition: background-color 0.2s, transform 0.15s;
        }
        .si-btn-primary:hover:not(:disabled) {
          background: ${C.primaryHover}; transform: scale(1.01);
        }
        .si-btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }
        .si-spinner {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          animation: si-spin 0.7s linear infinite;
        }
        @keyframes si-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div
        style={{
          width:           '100%',
          maxWidth:        '440px',
          background:      '#fff',
          borderRadius:    '16px',
          boxShadow:       '0 4px 24px rgba(0,0,0,0.08)',
          padding:         '40px 36px',
        }}
      >
        {/* Logo / brand */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display:        'inline-flex',
              alignItems:     'center',
              justifyContent: 'center',
              width:          '52px',
              height:         '52px',
              borderRadius:   '14px',
              background:     `${C.primary}18`,
              marginBottom:   '12px',
            }}
          >
            <Utensils size={26} color={C.primary} />
          </div>
          <h1
            style={{
              fontSize:   '22px',
              fontWeight: '700',
              color:      C.dark,
              margin:     '0 0 4px',
            }}
          >
            Welcome back
          </h1>
          <p style={{ fontSize: '14px', color: C.gray, margin: 0 }}>
            Sign in to continue to your account
          </p>
        </div>

        {/* Session-expired banner */}
        {sessionExpired && !error && (
          <div
            role="alert"
            style={{
              background:   '#FFFBEB',
              border:       '1px solid #FCD34D',
              borderRadius: '8px',
              padding:      '10px 14px',
              marginBottom: '18px',
              fontSize:     '14px',
              color:        '#92400E',
            }}
          >
            Session expired. Please sign in again.
          </div>
        )}

        {/* Registration success banner */}
        {justRegistered && !error && (
          <div
            role="status"
            style={{
              background:   '#F0FDF4',
              border:       '1px solid #86EFAC',
              borderRadius: '8px',
              padding:      '10px 14px',
              marginBottom: '18px',
              fontSize:     '14px',
              color:        '#166534',
            }}
          >
            Account created! Please sign in.
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            style={{
              background:   '#FEF2F2',
              border:       `1px solid #FCA5A5`,
              borderRadius: '8px',
              padding:      '10px 14px',
              marginBottom: '18px',
              fontSize:     '14px',
              color:        C.error,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="email"
              style={{
                display:      'block',
                fontSize:     '14px',
                fontWeight:   '500',
                color:        C.dark,
                marginBottom: '6px',
              }}
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              className={`si-input${error ? ' si-error' : ''}`}
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '22px' }}>
            <label
              htmlFor="password"
              style={{
                display:      'block',
                fontSize:     '14px',
                fontWeight:   '500',
                color:        C.dark,
                marginBottom: '6px',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                name="password"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                className={`si-input${error ? ' si-error' : ''}`}
                style={{ paddingRight: '44px' }}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                style={{
                  position:   'absolute',
                  right:      '12px',
                  top:        '50%',
                  transform:  'translateY(-50%)',
                  background: 'none',
                  border:     'none',
                  cursor:     'pointer',
                  padding:    '4px',
                  color:      C.gray,
                  display:    'flex',
                  alignItems: 'center',
                }}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" className="si-btn-primary" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="si-spinner" />
                Signing in…
              </>
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Footer links */}
        <p
          style={{
            textAlign:  'center',
            fontSize:   '14px',
            color:      C.gray,
            marginTop:  '20px',
            marginBottom: 0,
          }}
        >
          Don't have an account?{' '}
          <Link
            to="/sign-up"
            style={{ color: C.primary, fontWeight: '600', textDecoration: 'none' }}
          >
            Sign Up
          </Link>
        </p>

        <p
          style={{
            textAlign:  'center',
            fontSize:   '14px',
            color:      C.gray,
            marginTop:  '8px',
            marginBottom: 0,
          }}
        >
          <Link
            to="/"
            style={{ color: C.gray, textDecoration: 'underline', fontSize: '13px' }}
          >
            Continue browsing the menu
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignInPage;
