/* ─────────────────────────────────────────────────────────────────
   OrderHistoryPage — lists all past orders for the logged-in user.

   Each card shows:
     Order ID | Order Type | Items list | Total Price
     Payment Method | Payment Status (PAID/PENDING/FAILED) | Order Status | Date
   ───────────────────────────────────────────────────────────────── */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Loader2, AlertCircle,
  Calendar, CreditCard, Tag, Package,
  ChevronDown, ChevronUp, Clock, ExternalLink,
} from 'lucide-react';
import { fetchMyOrders } from '../services/orderService';
import { submitReview, getReviewsByOrderId } from '../services/reviewService';
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
  const [currentPage,  setCurrentPage ] = useState(1);
  const PAGE_SIZE = 10;

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

    const sorted = [...orders].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const safePage   = Math.min(currentPage, totalPages);
    const pageItems  = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    return (
      <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.dark, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={22} color={C.primary} /> My Orders
          </h1>
          <span style={{ fontSize: 13, color: C.muted }}>{sorted.length} order{sorted.length !== 1 ? 's' : ''}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {pageItems.map((order) => (
            <OrderCard key={order._id ?? order.id ?? order.orderId} order={order} navigate={navigate} />
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 28 }}>
            <button
              className="oh-page-btn"
              disabled={safePage === 1}
              onClick={() => setCurrentPage(safePage - 1)}
            >‹ Prev</button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`oh-page-btn${p === safePage ? ' oh-page-active' : ''}`}
                onClick={() => setCurrentPage(p)}
              >{p}</button>
            ))}

            <button
              className="oh-page-btn"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage(safePage + 1)}
            >Next ›</button>
          </div>
        )}
        {totalPages > 1 && (
          <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 10 }}>
            Page {safePage} of {totalPages}
          </p>
        )}
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
        .oh-page-btn { padding: 6px 12px; border-radius: 8px; border: 1px solid ${C.border}; background: #fff; color: ${C.dark}; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .oh-page-btn:hover:not(:disabled) { background: ${C.primary}; color: #fff; border-color: ${C.primary}; }
        .oh-page-btn:disabled { opacity: 0.38; cursor: default; }
        .oh-page-active { background: ${C.primary} !important; color: #fff !important; border-color: ${C.primary} !important; }
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
  const [expanded,        setExpanded       ] = useState(false);
  const [showReview,      setShowReview     ] = useState(false);
  const [existingReviews, setExistingReviews] = useState(null); // null = not fetched yet
  const [reviewsFetching, setReviewsFetching] = useState(false);

  /* Lazy-load existing reviews for this order, then open the modal */
  const handleReviewClick = async () => {
    if (existingReviews === null && !reviewsFetching) {
      setReviewsFetching(true);
      try {
        const list = await getReviewsByOrderId(orderId);
        setExistingReviews(Array.isArray(list) ? list : []);
      } catch {
        setExistingReviews([]); // on error fall back to empty (all editable)
      } finally {
        setReviewsFetching(false);
      }
    }
    setShowReview(true);
  };

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
          <span style={{
            padding: '3px 9px', borderRadius: 20,
            fontSize: 11, fontWeight: 700,
            background: osBadge.bg, color: osBadge.color,
          }}>
            {osBadge.label}
          </span>
        </div>

        {/* Row 2: Meta chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginBottom: 12 }}>
          {orderType && (
            <MetaChip icon={<Tag size={11} />} text={orderType} />
          )}
          {payMethod && (
            <MetaChip
              icon={<CreditCard size={11} />}
              text={payMethod + (payStatus ? ` (${payStatusStyle(payStatus).label})` : '')}
            />
          )}
          <MetaChip icon={<Package size={11} />} text={`${items.length} item${items.length !== 1 ? 's' : ''}`} />
          {createdAt && (
            <MetaChip icon={<Calendar size={11} />} text={createdAt} />
          )}
        </div>

        {/* Total + Details toggle + Review — same row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>
            Total&nbsp;<span style={{ color: C.primary, fontSize: 16, fontWeight: 800 }}>${total.toFixed(2)}</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {orderStatus.toUpperCase() === 'COMPLETED' && (
              <button
                onClick={handleReviewClick}
                disabled={reviewsFetching}
                style={{
                  padding: '5px 12px', borderRadius: 8,
                  fontSize: 12, fontWeight: 700,
                  background: reviewsFetching ? '#F3A4A9' : C.primary, color: '#fff',
                  border: 'none', cursor: reviewsFetching ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                  boxShadow: '0 2px 6px rgba(230,57,70,0.28)',
                }}
              >
                {reviewsFetching
                  ? <><span style={{ display: 'inline-block', width: 11, height: 11, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Loading…</>
                  : '★ Review'}
              </button>
            )}
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
      </div>

      {/* ── Review Modal (portalled to body) ── */}
      {showReview && createPortal(
        <ReviewModal
          order={order}
          orderId={orderId}
          items={items}
          existingReviews={existingReviews ?? []}
          onClose={() => setShowReview(false)}
          onReviewSubmitted={(submitted) => {
            setExistingReviews((prev) => {
              const base = Array.isArray(prev) ? prev : [];
              // Merge: replace existing entry for same menuProductId or append
              const merged = [...base];
              submitted.forEach((s) => {
                const idx = merged.findIndex(
                  (r) => (r.menuProductId ?? r.menuProduct?._id ?? r.menuProduct?.id ?? r.productId ?? '') === s.menuProductId
                );
                if (idx !== -1) merged[idx] = { ...merged[idx], ...s };
                else merged.push(s);
              });
              return merged;
            });
          }}
        />,
        document.body
      )}

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

/* ── Star Rating ───────────────────────────────────────────────────────────── */
const StarRating = ({ value, onChange, disabled }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        disabled={disabled}
        onClick={() => onChange(star)}
        style={{
          background: 'none', border: 'none',
          cursor: disabled ? 'default' : 'pointer',
          fontSize: 22, lineHeight: 1, padding: '0 1px',
          color: star <= value ? '#F59E0B' : '#D1D5DB',
          transition: 'color 0.1s',
        }}
        aria-label={`${star} star`}
      >★</button>
    ))}
  </div>
);

/* ── Review Modal ───────────────────────────────────────────────────────────── */
const ReviewModal = ({ order, orderId, items, onClose, existingReviews = [], onReviewSubmitted }) => {
  const [reviews, setReviews] = useState(() =>
    items.map((it) => {
      const itemProductId = it.menuItemId ?? it.menuProductId ?? it.productId ?? '';
      const existing = existingReviews.find((r) => {
        const rId = r.menuProductId ?? r.menuProduct?._id ?? r.menuProduct?.id ?? r.productId ?? '';
        return rId && rId === itemProductId;
      });
      return {
        rating:   existing?.rating   ?? 0,
        comment:  existing?.comment  ?? '',
        isLocked: !!existing,
      };
    })
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted ] = useState(false);
  const [errors,     setErrors    ] = useState([]);
  const [submitErr,  setSubmitErr ] = useState('');

  const setRating  = (idx, val) => setReviews((prev) => prev.map((r, i) => i === idx ? { ...r, rating: val  } : r));
  const setComment = (idx, val) => setReviews((prev) => prev.map((r, i) => i === idx ? { ...r, comment: val } : r));

  const allLocked = reviews.every((r) => r.isLocked);

  const handleSubmit = async () => {
    /* Validate: at least one non-locked item must have a rating */
    const hasAny = reviews.some((r) => !r.isLocked && r.rating > 0);
    if (!hasAny) { setSubmitErr('Please rate at least one item before submitting.'); return; }
    setErrors([]);
    setSubmitErr('');
    setSubmitting(true);
    try {
      const justSubmitted = [];
      for (let i = 0; i < items.length; i++) {
        if (reviews[i].isLocked) continue; // already reviewed — skip
        if (reviews[i].rating === 0) continue; // unrated — skip
        const it = items[i];
        const menuProductId =
          it.menuItemId ?? it.menuProductId ?? it.productId ??
          it.menuProduct?._id ?? it.menuProduct?.id ??
          it.product?._id ?? it.product?.id ?? '';
        const reviewRes = await submitReview({
          menuProductId,
          orderId,
          rating:  reviews[i].rating,
          comment: reviews[i].comment.trim(),
        });
        console.log('review', reviewRes);
        justSubmitted.push({ menuProductId, rating: reviews[i].rating, comment: reviews[i].comment.trim() });
      }
      if (justSubmitted.length > 0 && onReviewSubmitted) onReviewSubmitted(justSubmitted);
      setSubmitted(true);
    } catch (err) {
      setSubmitErr(err?.response?.data?.message ?? err?.message ?? 'Failed to submit reviews.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520,
        height: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px 14px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.dark }}>Rate Your Order</h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: C.muted }}>Share your experience for the items</p>
            {allLocked
              ? <p style={{ margin: '3px 0 0', fontSize: 10, color: '#1E40AF' }}>You have already reviewed all items in this order.</p>
              : <p style={{ margin: '3px 0 0', fontSize: 10, color: C.muted }}>You don't have to rate all items - you can rate any items you'd like</p>
            }
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 22, lineHeight: 1, padding: 4 }}
            aria-label="Close"
          >×</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 22px' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.dark, margin: '0 0 8px' }}>Thank you!</h3>
              <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Your reviews have been submitted.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {items.map((it, idx) => {
                const name = it.name ?? it.title ?? `Item ${idx + 1}`;
                return (
                  <div
                    key={idx}
                    style={{
                      border: `1px solid ${C.border}`,
                      borderRadius: 12, padding: '14px 16px',
                      background: reviews[idx].rating > 0 ? '#F0FDF4' : '#FAFAFA',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.dark }}>{name}</p>
                        {it.variantName && (
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted }}>Variant: {it.variantName}</p>
                        )}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.muted, flexShrink: 0 }}>
                        ×{it.quantity ?? 1}
                      </span>
                    </div>

                    {/* Stars */}
                    <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <StarRating
                        value={reviews[idx].rating}
                        onChange={(v) => setRating(idx, v)}
                        disabled={submitting || reviews[idx].isLocked}
                      />
                      {reviews[idx].isLocked && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px',
                          borderRadius: 20, background: '#DBEAFE', color: '#1E40AF',
                          letterSpacing: '0.3px',
                        }}>Already reviewed</span>
                      )}
                    </div>

                    {/* Comment */}
                    <textarea
                      rows={2}
                      placeholder={reviews[idx].isLocked ? '' : 'Write a comment (optional)…'}
                      value={reviews[idx].comment}
                      onChange={(e) => setComment(idx, e.target.value)}
                      disabled={submitting || reviews[idx].isLocked}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        border: `1px solid ${C.border}`, borderRadius: 8,
                        padding: '8px 10px', fontSize: 13, color: C.dark,
                        resize: reviews[idx].isLocked ? 'none' : 'vertical',
                        fontFamily: 'inherit',
                        background: (submitting || reviews[idx].isLocked) ? '#F3F4F6' : '#fff',
                        outline: 'none',
                        cursor: reviews[idx].isLocked ? 'default' : 'text',
                      }}
                    />
                  </div>
                );
              })}

              {submitErr && (
                <p style={{ margin: 0, fontSize: 13, color: '#EF4444', textAlign: 'center' }}>{submitErr}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!submitted && !allLocked && (
          <div style={{
            padding: '14px 22px',
            borderTop: `1px solid ${C.border}`,
            display: 'flex', gap: 10, justifyContent: 'flex-end',
          }}>
            <button
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '9px 20px', borderRadius: 10, border: `1px solid ${C.border}`,
                background: '#fff', color: C.dark, fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}
            >Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: '9px 24px', borderRadius: 10, border: 'none',
                background: submitting ? '#F3A4A9' : C.primary,
                color: '#fff', fontWeight: 700, fontSize: 14, cursor: submitting ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {submitting ? (
                <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Submitting…</>
              ) : 'Submit Reviews'}
            </button>
          </div>
        )}
        {(submitted || allLocked) && (
          <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{ padding: '9px 24px', borderRadius: 10, border: 'none', background: C.primary, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >Done</button>
          </div>
        )}
      </div>
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


