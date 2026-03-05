import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Home } from 'lucide-react';

const C = {
  primary:      '#E63946',
  primaryHover: '#C0252E',
  dark:         '#1F2937',
  muted:        '#6B7280',
  bg:           '#F4FAF6',
  cardBg:       '#FFFFFF',
  shadow:       '0 4px 24px rgba(31,41,55,0.10)',
};

const PaymentSuccessPage = () => {
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
            background: '#DCFCE7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <CheckCircle2 size={40} color="#16A34A" strokeWidth={2} />
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: C.dark, margin: '0 0 12px' }}>
          Payment Successful!
        </h1>
        <p style={{ fontSize: 15, color: C.muted, margin: '0 0 32px', lineHeight: 1.6 }}>
          Your payment was processed successfully. Your order has been confirmed
          and is being prepared.
        </p>

        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '13px 32px', borderRadius: 11,
            background: C.primary, color: '#fff',
            border: 'none', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(230,57,70,0.28)',
            transition: 'background-color 0.2s, transform 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = C.primaryHover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = C.primary)}
        >
          <Home size={16} />
          Go Back to Home
        </button>

        <p style={{ marginTop: 18, fontSize: 13, color: C.muted }}>
          You can view your order details in{' '}
          <span
            onClick={() => navigate('/order')}
            style={{ color: C.primary, cursor: 'pointer', fontWeight: 600 }}
          >
            My Orders
          </span>
          .
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
