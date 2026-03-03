/* ─────────────────────────────────────────────────────────────────
   Toast — lightweight self-dismissing notification.

   Usage:
     const [toast, setToast] = useToast();
     setToast({ type: 'success', message: 'Order placed!' });
     <Toast toast={toast} onClose={() => setToast(null)} />

   type: 'success' | 'error' | 'info'
   ───────────────────────────────────────────────────────────────── */

import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const STYLES = {
  success: {
    bg:     '#DCFCE7',
    border: '#86EFAC',
    color:  '#166534',
    Icon:   CheckCircle2,
  },
  error: {
    bg:     '#FEE2E2',
    border: '#FCA5A5',
    color:  '#991B1B',
    Icon:   XCircle,
  },
  info: {
    bg:     '#DBEAFE',
    border: '#93C5FD',
    color:  '#1E40AF',
    Icon:   Info,
  },
};

/**
 * Renders a fixed-position toast overlay.
 * @param {{ type: string, message: string } | null} toast
 * @param {() => void} onClose
 * @param {number} [duration=3500]  ms before auto-dismiss
 */
const Toast = ({ toast, onClose, duration = 3500 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) { setVisible(false); return; }
    setVisible(true);
    const id = setTimeout(() => { setVisible(false); setTimeout(onClose, 300); }, duration);
    return () => clearTimeout(id);
  }, [toast, duration, onClose]);

  if (!toast) return null;

  const s = STYLES[toast.type] ?? STYLES.info;
  const { Icon } = s;

  return (
    <div
      style={{
        position:   'fixed',
        top:        20,
        right:      20,
        zIndex:     9999,
        maxWidth:   360,
        width:      'calc(100vw - 40px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0)' : 'translateY(-10px)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div
        style={{
          display:      'flex',
          alignItems:   'flex-start',
          gap:          10,
          background:   s.bg,
          border:       `1px solid ${s.border}`,
          borderRadius: 12,
          padding:      '12px 14px',
          boxShadow:    '0 4px 20px rgba(0,0,0,0.10)',
        }}
      >
        <Icon size={18} color={s.color} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ flex: 1, margin: 0, fontSize: 14, fontWeight: 500, color: s.color, lineHeight: 1.4 }}>
          {toast.message}
        </p>
        <button
          onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 2, color: s.color, opacity: 0.6,
            display: 'flex', alignItems: 'center',
          }}
          aria-label="Dismiss"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};

/**
 * Hook — returns [toast state, setter].
 * @returns {[{type: string, message: string}|null, Function]}
 */
export const useToast = () => {
  const [toast, setToast] = useState(null);
  return [toast, setToast];
};

export default Toast;
