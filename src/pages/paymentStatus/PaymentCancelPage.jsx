import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, Home, ShoppingCart } from 'lucide-react';

const C = {
  primary:      '#E63946',
  primaryHover: '#C0252E',
  dark:         '#1F2937',
  muted:        '#6B7280',
  bg:           '#F4FAF6',
  cardBg:       '#FFFFFF',
  shadow:       '0 4px 24px rgba(31,41,55,0.10)',
  border:       '#E5E7EB',
};

const PaymentCancelPage = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 80px)',
        backgroundColor: C.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          background: C.cardBg,
          borderRadius: 20,
          boxShadow: C.shadow,
          padding: '48px 40px',
          maxWidth: 460,
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 80, height: 80, borderRadius: '50%',
            background: '#FEF9C3',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <Ban size={40} color="#854D0E" strokeWidth={2} />
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: C.dark, margin: '0 0 12px' }}>
          Payment Cancelled
        </h1>
        <p style={{ fontSize: 15, color: C.muted, margin: '0 0 32px', lineHeight: 1.6 }}>
          You cancelled the payment process. Your order has not been placed.
          You can return to your cart and try again whenever you're ready.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={() => navigate('/cart')}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px 32px', borderRadius: 11,
              background: C.primary, color: '#fff',
              border: 'none', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(230,57,70,0.28)',
              transition: 'background-color 0.2s, transform 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.primaryHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = C.primary)}
          >
            <ShoppingCart size={16} />
            Return to Cart
          </button>

          <button
            onClick={() => navigate('/')}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 32px', borderRadius: 11,
              background: 'none', color: C.muted,
              border: `1.5px solid ${C.border}`, fontSize: 14, fontWeight: 500,
              cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = C.primary;
              e.currentTarget.style.color = C.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.color = C.muted;
            }}
          >
            <Home size={15} />
            Go Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelPage;
