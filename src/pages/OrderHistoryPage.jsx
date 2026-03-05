/* ─────────────────────────────────────────────────────────────────
   OrderHistoryPage — lists all past orders for the logged-in user.

   Each card shows:
     Order ID | Order Type | Items list | Total Price
     Payment Method | Payment Status (PAID/PENDING/FAILED) | Order Status | Date
   ───────────────────────────────────────────────────────────────── */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Loader2, AlertCircle,
  Calendar, CreditCard, Tag, Package,
  ChevronDown, ChevronUp, Clock, ExternalLink,
} from 'lucide-react';
import { fetchMyOrders } from '../services/orderService';
import { getToken, getTenantId } from '../services/authService';
import Toast, { useToast } from '../components/common/Toast';

/* ── Theme ──────────────────────────────────────────────────────── */
const C = {
  primary:      '#E63946',
  primaryHover: '#C0252E',
  dark:         '#1F2937',
  muted:        '#6B7280',
  border:       '#E5E7EB',
  bg:           '#F4FAF6',
  cardBg:       '#FFFFFF',
  shadow:       '0 2px 14px rgba(31,41,55,0.07)',
};

/* ── Order status badge colours ──────────────────────────────── */
const ORDER_STATUS_STYLES = {
  PENDING:    { bg: '#FEF9C3', color: '#854D0E', label: 'Pending'   },
  CONFIRMED:  { bg: '#DBEAFE', color: '#1E40AF', label: 'Confirmed' },
  PREPARING:  { bg: '#FEF3C7', color: '#92400E', label: 'Preparing' },
  READY:      { bg: '#D1FAE5', color: '#065F46', label: 'Ready'     },
  DELIVERED:  { bg: '#DCFCE7', color: '#166534', label: 'Delivered' },
  CANCELLED:  { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelled' },
  COMPLETED:  { bg: '#DCFCE7', color: '#166534', label: 'Completed' },
};

/* ── Payment status badge colours ────────────────────────────── */
const PAY_STATUS_STYLES = {
  PAID:    { bg: '#DCFCE7', color: '#166534', label: 'Paid'    },
  PENDING: { bg: '#FEF9C3', color: '#854D0E', label: 'Pending' },
  FAILED:  { bg: '#FEE2E2', color: '#991B1B', label: 'Failed'  },
  UNPAID:  { bg: '#FEF9C3', color: '#854D0E', label: 'Unpaid'  },
};

const orderStatusStyle = (s = '') =>
  ORDER_STATUS_STYLES[s.toUpperCase()] ?? { bg: '#F3F4F6', color: '#374151', label: s };

const payStatusStyle = (s = '') =>
  PAY_STATUS_STYLES[s.toUpperCase()] ?? { bg: '#F3F4F6', color: '#374151', label: s };

const OrderHistoryPage = () => {
  const navigate = useNavigate();
  const [orders,       setOrders      ] = useState([]);
  const [loading,      setLoading     ] = useState(true);
  const [error,        setError       ] = useState('');
  const [toast,        setToast       ] = useToast();
  const [successBanner, setSuccessBanner] = useState('');

  /* Session guard — redirect to sign-in if token or tenantId is missing */
  useEffect(() => {
    const tok = getToken();
    const tid = getTenantId();
    console.debug('[OrderHistory] localStorage accessToken:', tok ? '✅ present' : '❌ MISSING');
    console.debug('[OrderHistory] localStorage tenantId:', tid ?? '❌ MISSING');
    if (!tok || !tid) {
      navigate('/sign-in', { replace: true });
      return;
    }
    /* Pick up success message set by OrderReviewPage before redirect */
    const msg = sessionStorage.getItem('orderSuccessToast');
    if (msg) {
      setSuccessBanner(msg);
      sessionStorage.removeItem('orderSuccessToast');
      const id = setTimeout(() => setSuccessBanner(''), 5000);
      return () => clearTimeout(id);
    }
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetchMyOrders();
        console.debug('[OrderHistory] GET /order raw response:', res);
        if (!cancelled) {
          // Unwrap common envelope shapes: [], { data: [] }, { orders: [] }, { items: [] }
          const list = Array.isArray(res)
            ? res
            : res?.data ?? res?.orders ?? res?.items ?? [];
          console.debug('[OrderHistory] parsed order list length:', list.length);
          setOrders(list);
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load orders.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  /* ── Shared wrapper — Toast + success banner always rendered ── */
  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <Loader2 size={36} color={C.primary} style={{ animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: 15, color: C.muted, margin: 0 }}>Loading your orders…</p>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <AlertCircle size={48} color="#EF4444" style={{ marginBottom: 12 }} />
            <p style={{ color: C.dark, fontWeight: 600, marginBottom: 6 }}>Could not load orders</p>
            <p style={{ color: C.muted, fontSize: 14 }}>{error}</p>
          </div>
        </div>
      );
    }

    if (orders.length === 0) {
      return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <ShoppingBag size={60} color="#D1D5DB" style={{ marginBottom: 18 }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 8 }}>No orders yet</h2>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>Place your first order and it will appear here.</p>
            <button
              onClick={() => navigate('/restaurants')}
              style={{ padding: '11px 28px', background: C.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
            >
              Browse Restaurants
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.dark, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Package size={22} color={C.primary} /> My Orders
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[...orders].reverse().map((order) => (
            <OrderCard key={order._id ?? order.id ?? order.orderId} order={order} navigate={navigate} />
          ))}
        </div>
      </div>
    );
  };

  /* ── Single outer return — Toast + success banner always present ── */
  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', backgroundColor: C.bg, padding: '28px 16px 48px', display: 'flex', flexDirection: 'column' }}>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .oh-card { transition: box-shadow 0.18s, transform 0.18s; cursor: default; }
        .oh-card:hover { box-shadow: 0 6px 28px rgba(31,41,55,0.13); transform: translateY(-1px); }
        .oh-toggle-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; padding: 4px 6px; border-radius: 6px; transition: background-color 0.15s; }
        .oh-toggle-btn:hover { background: rgba(0,0,0,0.05); }
        @keyframes bannerIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* ── Success banner (prominent, auto-hides) ── */}
      {successBanner && (
        <div style={{
          maxWidth: 720, margin: '0 auto 20px', width: '100%',
          background: '#DCFCE7', border: '1px solid #86EFAC',
          borderRadius: 12, padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'bannerIn 0.3s ease',
        }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#166534' }}>
            {successBanner}
          </p>
          <button
            onClick={() => setSuccessBanner('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#166534', opacity: 0.7, fontSize: 18, lineHeight: 1 }}
            aria-label="Dismiss"
          >×</button>
        </div>
      )}

      {renderContent()}
    </div>
  );
};

/* ── Order Card ────────────────────────────────────────────────────────── */
const OrderCard = ({ order, navigate }) => {
  const [expanded, setExpanded] = useState(false);

  const orderId       = order._id ?? order.id ?? order.orderId ?? '';
  const shortId       = orderId.toString().slice(-8).toUpperCase();
  const orderStatus   = order.status ?? order.orderStatus ?? 'PENDING';
  const payStatus     = order.paymentStatus ?? order.payment_status ?? '';
  const payMethod     = order.paymentMethod ?? order.payment_method ?? '';
  const orderType     = (order.orderType ?? order.order_type ?? '').replace('_', ' ');
  const total         = Number(order.totalPrice ?? order.total ?? 0);
  const items         = order.items ?? [];
  const createdAt     = order.createdAt
    ? new Date(order.createdAt).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '';

  // Pricing breakdown
  const itemsSubtotal = items.reduce((s, it) => s + Number(it.price ?? 0) * (it.quantity ?? 1), 0);
  const subtotal  = order.subtotal  != null ? Number(order.subtotal)
                  : order.subTotal  != null ? Number(order.subTotal)
                  : itemsSubtotal;
  const tax       = order.tax       != null ? Number(order.tax)
                  : order.taxAmount != null ? Number(order.taxAmount)
                  : subtotal * 0.08;
  const serviceFee= order.serviceFee   != null ? Number(order.serviceFee)
                  : order.service_fee  != null ? Number(order.service_fee)
                  : (total - subtotal - tax > 0 ? total - subtotal - tax : 1.99);
  const estMins   = order.estimatedDeliveryTimeInMinutes ?? order.estimatedDeliveryTime ?? null;

  const osBadge  = orderStatusStyle(orderStatus);
  const payBadge = payStatus ? payStatusStyle(payStatus) : null;

  return (
    <div
      className="oh-card"
      style={{
        background: C.cardBg, borderRadius: 16,
        boxShadow: C.shadow, border: `1px solid ${C.border}`,
        overflow: 'hidden',
      }}
    >
      {/* ── Card header ── */}
      <div style={{ padding: '16px 20px 14px' }}>

        {/* Row 1: Order ID + Status badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 12, color: C.muted, margin: '0 0 2px', fontWeight: 500 }}>Order</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: C.dark, margin: 0, letterSpacing: '0.3px' }}>
              #{shortId}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{
              padding: '3px 9px', borderRadius: 20,
              fontSize: 11, fontWeight: 700,
              background: osBadge.bg, color: osBadge.color,
            }}>
              {osBadge.label}
            </span>
          </div>
        </div>

        {/* Row 2: Meta chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginBottom: 12 }}>
          {orderType && (
            <MetaChip icon={<Tag size={11} />} text={orderType} />
          )}
          {payMethod && (
            <MetaChip icon={<CreditCard size={11} />} text={payMethod} />
          )}
          {createdAt && (
            <MetaChip icon={<Calendar size={11} />} text={createdAt} />
          )}
        </div>

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>Total</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.primary }}>${total.toFixed(2)}</span>
        </div>

        {/* Row 3: Items preview + toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
            {items.length} item{items.length !== 1 ? 's' : ''}
            {items.length > 0 && !expanded && (
              <span style={{ color: C.dark }}>
                {' — '}
                {items.slice(0, 2).map((it, i) => (
                  <span key={i}>
                    {it.name ?? it.title ?? 'Item'}
                    {it.quantity > 1 ? ` ×${it.quantity}` : ''}
                    {i < Math.min(items.length, 2) - 1 ? ', ' : ''}
                  </span>
                ))}
                {items.length > 2 && ` +${items.length - 2} more`}
              </span>
            )}
          </p>
          <button
            className="oh-toggle-btn"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            style={{ color: C.primary }}
          >
            {expanded ? <><ChevronUp size={14} /> Hide</> : <><ChevronDown size={14} /> Details</>}
          </button>
        </div>
      </div>

      {/* ── Expanded: full detail ── */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 20px' }}>

          {/* Estimated delivery time */}
          {estMins && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 13, color: C.muted }}>
              <Clock size={13} />
              <span>Estimated delivery: <strong style={{ color: C.dark }}>{estMins} min</strong></span>
            </div>
          )}

          {/* Items */}
          <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 8px' }}>Items</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {items.map((it, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, color: C.dark, fontWeight: 600 }}>
                      {it.name ?? it.title ?? 'Item'}
                    </span>
                    <span style={{ fontSize: 12, color: C.muted, marginLeft: 5 }}>×{it.quantity ?? 1}</span>
                    {/* Variant */}
                    {(it.variantName ?? it.variant ?? it.variantLabel) && (
                      <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0', paddingLeft: 2 }}>
                        Variant: {it.variantName ?? it.variant ?? it.variantLabel}
                      </p>
                    )}
                    {/* Add-ons */}
                    {Array.isArray(it.addons) && it.addons.length > 0 && (
                      <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0', paddingLeft: 2 }}>
                        Add-ons: {it.addons.map((a) => a.name ?? a.addonName ?? a.label ?? a.addonId ?? '').filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.dark, flexShrink: 0, marginLeft: 12 }}>
                    ${(Number(it.price ?? 0) * (it.quantity ?? 1)).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing breakdown */}
          <div style={{ height: 1, background: C.border, marginBottom: 12 }} />
          <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 8px' }}>Pricing</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
            <PriceRow label="Subtotal"    value={`$${subtotal.toFixed(2)}`} />
            <PriceRow label="Tax (8%)"   value={`$${tax.toFixed(2)}`} />
            <PriceRow label="Service Fee" value={`$${serviceFee.toFixed(2)}`} />
          </div>
          <div style={{ height: 1, background: C.border, marginBottom: 10 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Grand Total</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.primary }}>${total.toFixed(2)}</span>
          </div>

          {/* Payment info */}
          <div style={{ height: 1, background: C.border, marginBottom: 10 }} />
          <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 8px' }}>Payment</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
            {payMethod && <PriceRow label="Method" value={payMethod} />}
            {payStatus && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: C.muted }}>Status</span>
                <span style={{
                  padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: payStatusStyle(payStatus).bg, color: payStatusStyle(payStatus).color,
                }}>{payStatusStyle(payStatus).label}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Meta chip ───────────────────────────────────────────────────────────────── */
const MetaChip = ({ icon, text }) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.muted }}>
    {icon}
    <span style={{ textTransform: 'capitalize' }}>{text}</span>
  </span>
);

/* ── Price row ───────────────────────────────────────────────────────────────── */
const PriceRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
    <span style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>{value}</span>
  </div>
);

export default OrderHistoryPage;


