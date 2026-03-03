/* ─────────────────────────────────────────────────────────────────
   OrderConfirmationPage — shown after a successful POST /orders.

   Receives via React Router location.state:
   {
     orderId       : string | null   (from backend response)
     orderType     : string          e.g. "DINE_IN"
     paymentMethod : string          e.g. "CASH"
     total         : number          grand total paid
   }

   If the user navigates directly (no state) it still renders gracefully.
   ───────────────────────────────────────────────────────────────── */

import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Utensils, CreditCard, Receipt, ListOrdered } from 'lucide-react';

/* ── Theme ──────────────────────────────────────────────────────── */
const C = {
  primary:      '#E63946',
  primaryHover: '#C0252E',
  green:        '#16A34A',
  greenLight:   '#DCFCE7',
  dark:         '#1F2937',
  muted:        '#6B7280',
  border:       '#E5E7EB',
  bg:           '#F4FAF6',
  cardBg:       '#FFFFFF',
  shadow:       '0 4px 28px rgba(31,41,55,0.10)',
};

const OrderConfirmationPage = () => {
  const { state }  = useLocation();
  const navigate   = useNavigate();
  const animRef    = useRef(false);

  const orderId       = state?.orderId       ?? null;
  const orderType     = state?.orderType     ?? 'DINE_IN';
  const paymentMethod = state?.paymentMethod ?? 'CASH';
  const total         = state?.total         ?? 0;

  /* Prevent going back to the review page after placing order */
  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  return (
    <div style={{
      minHeight: 'calc(100vh - 80px)',
      backgroundColor: C.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
    }}>

      <style>{`
        @keyframes oc-pop {
          0%   { transform: scale(0.6); opacity: 0; }
          70%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes oc-fadein {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .oc-card { animation: oc-fadein 0.4s ease both; }
        .oc-check { animation: oc-pop 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        .oc-cta-primary {
          flex: 1; padding: 13px 10px;
          background: ${C.primary}; color: #fff;
          border: none; border-radius: 11px;
          font-size: 14px; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          transition: background-color 0.2s, transform 0.15s;
          box-shadow: 0 4px 14px rgba(230,57,70,0.28);
        }
        .oc-cta-primary:hover { background: ${C.primaryHover}; transform: scale(1.01); }
        .oc-cta-secondary {
          flex: 1; padding: 13px 10px;
          background: #fff; color: ${C.dark};
          border: 1.5px solid ${C.border}; border-radius: 11px;
          font-size: 14px; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          transition: border-color 0.2s, color 0.2s;
        }
        .oc-cta-secondary:hover { border-color: ${C.primary}; color: ${C.primary}; }
      `}</style>

      <div
        className="oc-card"
        style={{
          background:    C.cardBg,
          borderRadius:  20,
          boxShadow:     C.shadow,
          padding:       '44px 36px 40px',
          maxWidth:      460,
          width:         '100%',
          textAlign:     'center',
        }}
      >
        {/* ── Animated check icon ── */}
        <div className="oc-check" style={{ display: 'inline-flex', marginBottom: 20 }}>
          <CheckCircle2 size={76} color={C.green} strokeWidth={1.8} />
        </div>

        {/* ── Headline ── */}
        <h1 style={{ fontSize: 26, fontWeight: 800, color: C.dark, margin: '0 0 8px' }}>
          Order Placed! 🎉
        </h1>
        <p style={{ fontSize: 15, color: C.muted, margin: '0 0 28px', lineHeight: 1.6 }}>
          Your order has been received and is being prepared.
        </p>

        {/* ── Order details card ── */}
        <div style={{
          background:   '#F9FAFB',
          borderRadius: 12,
          padding:      '18px 20px',
          marginBottom: 28,
          textAlign:    'left',
        }}>
          {orderId && (
            <DetailRow
              icon={<Receipt size={15} />}
              label="Order #"
              value={orderId.toString().slice(-8).toUpperCase()}
            />
          )}
          <DetailRow
            icon={<Utensils size={15} />}
            label="Type"
            value={orderType.replace('_', '-')}
          />
          <DetailRow
            icon={<CreditCard size={15} />}
            label="Payment"
            value={paymentMethod}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Total Charged</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: C.primary }}>
              ${total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* ── CTA buttons ── */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="oc-cta-secondary"
            onClick={() => navigate('/order', { replace: true })}
          >
            <ListOrdered size={15} /> Order History
          </button>
          <button
            className="oc-cta-primary"
            onClick={() => navigate('/order-tracking', { state: { orderId } })}
          >
            <ListOrdered size={15} /> Track Order
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Detail Row ─────────────────────────────────────────────────── */
const DetailRow = ({ icon, label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
    <span style={{ fontSize: 13, color: C.muted, display: 'flex', alignItems: 'center', gap: 5 }}>
      {icon}{label}
    </span>
    <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{value}</span>
  </div>
);

export default OrderConfirmationPage;
