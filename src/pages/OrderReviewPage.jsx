/* ─────────────────────────────────────────────────────────────────
   OrderReviewPage — checkout / order confirmation step.

   Flow:
     CartPage → (Proceed to Checkout) → OrderReviewPage
       → POST /order → clear cart → /order-history (success toast)

   Features:
   • Displays cart items with quantity controls (+ / –)
   • Shows subtotal / tax / service-fee / grand total
   • Order type selector (TAKEAWAY default; DINE_IN structure ready)
   • Payment method selector: CASH | CARD | BKASH
   • Optional order note
   • "Place Order" button with duplicate-submit guard & spinner
   • Success → clear cart → navigate to /order-history
   • Error toast with backend message (no redirect on error)
   • tenantId guard — redirect to / if missing
   ───────────────────────────────────────────────────────────────── */

import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingBag, Plus, Minus, Trash2, Loader2,
  ClipboardList, AlertCircle, ChevronLeft,
  Banknote, CreditCard, Smartphone,
} from 'lucide-react';
import { CartContext }               from '../context/CartContext';
import { useAuth }                   from '../context/AuthContext';
import { useRestaurant }             from '../context/RestaurantContext';
import { placeOrder, buildOrderItems } from '../services/orderService';
import { getTenantId }               from '../services/authService';
import Toast, { useToast }           from '../components/common/Toast';

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
  shadowStrong: '0 4px 24px rgba(31,41,55,0.10)',
};

const TAX_RATE    = 0.08;  // 8 %
const SERVICE_FEE = 1.99;

const EST_MINUTES = 30;

/* ── Order type options — DINE_IN kept for future use ───────────── */
const ORDER_TYPES = [
  { value: 'TAKEAWAY', label: 'Takeaway' },
  // { value: 'DINE_IN', label: 'Dine In' },  // uncomment when implemented
];

/* ── Payment method options ─────────────────────────────────────── */
const PAYMENT_METHODS = [
  { value: 'CASH',  label: 'Cash',  Icon: Banknote,   desc: 'Pay at pickup'       },
  { value: 'CARD',  label: 'Card',  Icon: CreditCard, desc: 'Credit / Debit card' },
  { value: 'BKASH', label: 'bKash', Icon: Smartphone, desc: 'Mobile banking'      },
];

const OrderReviewPage = () => {
  const { cart, updateQuantity, removeFromCart, clearCart, cartTotal, cartRestaurantId } =
    useContext(CartContext);
  const { handleResponseError } = useAuth();
  const { currentRestaurant }         = useRestaurant();
  const navigate                      = useNavigate();
  const location                      = useLocation();

  /* ── Coupon / discount passed from CartPage ── */
  const passedFinalTotalCents    = location.state?.finalTotalCents    ?? null;
  const passedDiscountAmountCents= location.state?.discountAmountCents ?? 0;
  const passedCouponCode         = location.state?.couponCode          ?? '';

  /* ── Local state ── */
  const [orderType,     setOrderType    ] = useState('TAKEAWAY');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [orderNote,     setOrderNote    ] = useState('');
  const [loading,       setLoading      ] = useState(false);
  const [errorMsg,      setErrorMsg     ] = useState('');
  const [toast,         setToast        ] = useToast();

  /* ── Guard: tenantId required ── */
  useEffect(() => {
    if (!getTenantId()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  /* ── Derived totals ── */
  const subtotal = cartTotal;
  const tax      = subtotal * TAX_RATE;
  // totalCents: prefer value passed from CartPage (includes coupon); fall back to Math.ceil
  const baseTotalCents      = Math.ceil((subtotal + tax + SERVICE_FEE) * 100);
  const totalCents          = passedFinalTotalCents ?? baseTotalCents;
  const discountAmountCents = passedDiscountAmountCents;
  // Dollar display values
  const baseTotalDollars  = baseTotalCents / 100;   // pre-discount Order Total
  const discountDollars   = discountAmountCents / 100;
  const totalDollars      = totalCents / 100;       // Amount Payable
  const hasDiscount       = discountAmountCents > 0;
  const isEmpty           = cart.length === 0;

  /* ── Determine restaurant ID ── */
  const restaurantId =
    currentRestaurant?.id ??
    currentRestaurant?._id ??
    cartRestaurantId ??
    '';

  /* ── Place order ── */
  const handlePlaceOrder = useCallback(async () => {
    if (loading || isEmpty) return;
    setErrorMsg('');

    // Guard: tenantId must be in localStorage for x-tenant-id header
    if (!getTenantId()) {
      setErrorMsg(
        'Session error: tenant ID is missing. Please sign out and sign in again.',
      );
      return;
    }

    // Normalise cart → API shape (name, menuItemId, addons, etc.)
    const orderItems = buildOrderItems(cart);

    // Safety: every item must have a name (backend schema requires it)
    const missingName = orderItems.find((i) => !i.name);
    if (missingName) {
      setErrorMsg(
        `Item "${missingName.menuItemId}" is missing a name. Please remove it and re-add from the menu.`,
      );
      return;
    }
    // Guard: every item must carry variantId (set from backend when added to cart)
    const missingVariant = orderItems.find((i) => !i.variantId);
    if (missingVariant) {
      const msg = `"${missingVariant.name}" is missing a product variant. Please remove it and re-add from the menu.`;
      setErrorMsg(msg);
      setToast({ type: 'error', message: msg });
      return;
    }
    setLoading(true);

    const payload = {
      restaurantId,
      orderType,
      ...(orderType === 'DINE_IN' ? { tableId: undefined } : {}), // tableId wired here when table-selection is added
      paymentMethod,
      // Backend expects integer cents: $8.46 → 846
      totalPrice:                     totalCents,
      notes:                          orderNote.trim() || undefined,
      estimatedDeliveryTimeInMinutes: EST_MINUTES,
      items:                          orderItems,
      // Coupon — only send when a coupon was applied on CartPage
      ...(passedCouponCode          ? { couponCode:      passedCouponCode }       : {}),
      ...(discountAmountCents > 0   ? { discountAmount:  discountAmountCents }    : {}),
    };

    try {
      await placeOrder(payload);

      /* ── Success ── */
      // Write toast BEFORE navigate so it is ready when /order mounts.
      sessionStorage.setItem('orderSuccessToast', 'Order placed successfully!');
      clearCart();
      navigate('/order', { replace: true });
    } catch (err) {
      /* 401 / 403 — handled by AuthContext (clears session + redirects) */
      if (err?.name === 'ApiError' && handleResponseError(err)) {
        setLoading(false);
        return;
      }
      const msg = err?.message || 'Failed to place order. Please try again.';
      setErrorMsg(msg);
      setToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  }, [
    loading, isEmpty, restaurantId,
    orderType, paymentMethod, totalCents, orderNote,
    passedCouponCode, discountAmountCents,
    cart, clearCart, navigate, handleResponseError, setToast,
  ]);

  /* ── Empty cart fallback ── */
  if (isEmpty) {
    return (
      <div style={{ minHeight: 'calc(100vh - 80px)', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <ShoppingBag size={60} color="#D1D5DB" style={{ marginBottom: 18 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Your cart is empty</h2>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>Add items before reviewing your order.</p>
          <button
            onClick={() => navigate(-1)}
            style={{ padding: '11px 28px', borderRadius: 10, background: C.primary, color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', backgroundColor: C.bg, padding: '28px 16px 60px' }}>
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* ── Scoped styles ── */}
      <style>{`
        .or-qty-btn {
          width:30px;height:30px;border-radius:8px;
          border:1.5px solid ${C.border};background:#fff;
          display:flex;align-items:center;justify-content:center;
          cursor:pointer;color:${C.dark};flex-shrink:0;
          transition:border-color 0.15s,background-color 0.15s;
        }
        .or-qty-btn:hover{border-color:${C.primary};background:rgba(230,57,70,0.06);}
        .or-remove-btn{
          border:none;background:none;cursor:pointer;padding:6px 7px;
          border-radius:8px;color:#9CA3AF;
          transition:color 0.15s,background-color 0.15s;
          display:flex;align-items:center;
        }
        .or-remove-btn:hover{color:#EF4444;background:#FEF2F2;}
        .or-place-btn{
          width:100%;padding:14px;
          background:${C.primary};color:#fff;
          border:none;border-radius:11px;
          font-size:16px;font-weight:700;cursor:pointer;
          display:flex;align-items:center;justify-content:center;gap:8px;
          transition:background-color 0.2s,transform 0.15s;
          box-shadow:0 4px 16px rgba(230,57,70,0.30);
        }
        .or-place-btn:hover:not(:disabled){background:${C.primaryHover};transform:scale(1.01);}
        .or-place-btn:disabled{opacity:0.55;cursor:not-allowed;box-shadow:none;}
        .or-pay-btn{
          flex:1;padding:12px 10px;border-radius:10px;
          border:2px solid ${C.border};background:#fff;
          cursor:pointer;text-align:center;
          transition:border-color 0.18s,background-color 0.18s,box-shadow 0.18s;
          display:flex;flex-direction:column;align-items:center;gap:5px;
        }
        .or-pay-btn:hover{border-color:${C.primary};background:rgba(230,57,70,0.04);}
        .or-pay-btn.active{
          border-color:${C.primary};background:rgba(230,57,70,0.06);
          box-shadow:0 0 0 3px rgba(230,57,70,0.15);
        }
        .or-select{
          width:100%;padding:9px 12px;border-radius:9px;
          border:1.5px solid ${C.border};font-size:14px;color:${C.dark};
          background:#fff;outline:none;cursor:pointer;
          transition:border-color 0.2s;
        }
        .or-select:focus{border-color:${C.primary};}
        .or-textarea{
          width:100%;padding:10px 13px;border-radius:9px;
          border:1.5px solid ${C.border};font-size:14px;color:${C.dark};
          background:#fff;outline:none;resize:vertical;min-height:72px;
          transition:border-color 0.2s;box-sizing:border-box;
        }
        .or-textarea:focus{border-color:${C.primary};}
        @media(max-width:740px){.or-grid{grid-template-columns:1fr !important;}}
      `}</style>

      {/* ── Page header ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: C.muted, padding: '4px 2px' }}
          aria-label="Back"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.dark, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <ClipboardList size={24} color={C.primary} />
          Review Your Order
        </h1>
      </div>

      {/* ── Two-column grid ── */}
      <div
        className="or-grid"
        style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 24, alignItems: 'start' }}
      >

        {/* ══════════════════════════════════════════
            LEFT — Items + Options
           ══════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Items list */}
          <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.shadow, padding: '20px 20px 8px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginTop: 0, marginBottom: 16 }}>
              Items ({cart.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cart.map((item) => (
                <ReviewItemRow
                  key={item.id}
                  item={item}
                  onQty={updateQuantity}
                  onRemove={removeFromCart}
                />
              ))}
            </div>
          </div>

          {/* Order options */}
          <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.shadow, padding: '20px 20px 24px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginTop: 0, marginBottom: 16 }}>
              Order Options
            </h2>

            {/* Order type */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>
                Order Type
              </label>
              <select
                className="or-select"
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
              >
                {ORDER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Payment method */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 10 }}>
                Payment Method
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                {PAYMENT_METHODS.map(({ value, label, Icon, desc }) => (
                  <button
                    key={value}
                    type="button"
                    className={`or-pay-btn${paymentMethod === value ? ' active' : ''}`}
                    onClick={() => setPaymentMethod(value)}
                    aria-pressed={paymentMethod === value}
                  >
                    <Icon size={20} color={paymentMethod === value ? C.primary : C.muted} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: paymentMethod === value ? C.primary : C.dark }}>
                      {label}
                    </span>
                    <span style={{ fontSize: 10, color: C.muted }}>{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>
                Order Note <span style={{ fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                className="or-textarea"
                placeholder="Any special requests for the kitchen?"
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                maxLength={300}
              />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            RIGHT — Price Summary + CTA (sticky)
           ══════════════════════════════════════════ */}
        <div style={{ position: 'sticky', top: 96 }}>
          <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.shadowStrong, padding: '24px 22px' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: C.dark, marginTop: 0, marginBottom: 20 }}>
              Price Summary
            </h2>

            {/* ── Charge rows ── */}
            <SummaryRow label="Subtotal"                               value={subtotal}    />
            <SummaryRow label={`Tax (${Math.round(TAX_RATE * 100)}%)`} value={tax}         />
            <SummaryRow label="Service fee"                             value={SERVICE_FEE}  />

            <div style={{ height: 1, background: C.border, margin: '12px 0' }} />

            {/* ── Order Total row ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hasDiscount ? 8 : 0 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Order Total</span>
              {hasDiscount ? (
                <span style={{ fontSize: 14, fontWeight: 600, color: C.muted, textDecoration: 'line-through' }}>
                  ${baseTotalDollars.toFixed(2)}
                </span>
              ) : (
                <span style={{ fontSize: 20, fontWeight: 800, color: C.primary }}>
                  ${baseTotalDollars.toFixed(2)}
                </span>
              )}
            </div>

            {/* ── Discount + Amount Payable (coupon active only) ── */}
            {hasDiscount && (
              <>
                {/* Discount row */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 10,
                  background: '#F0FDF4', borderRadius: 8, padding: '7px 10px',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#15803D', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 14 }}>🏷️</span>
                    Discount{passedCouponCode ? ` (${passedCouponCode})` : ''}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#15803D' }}>
                    −${discountDollars.toFixed(2)}
                  </span>
                </div>

                {/* Second divider */}
                <div style={{ height: 1, background: C.border, margin: '10px 0 12px' }} />

                {/* Amount Payable — prominent */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'rgba(230,57,70,0.05)', borderRadius: 10,
                  padding: '10px 12px', marginBottom: 10,
                }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Amount Payable</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: C.primary }}>
                    ${totalDollars.toFixed(2)}
                  </span>
                </div>

                {/* Savings badge */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#DCFCE7', borderRadius: 8,
                  padding: '7px 11px', marginBottom: 6,
                  fontSize: 12, fontWeight: 600, color: '#15803D',
                }}>
                  <span style={{ fontSize: 15 }}>🎉</span>
                  You saved ${discountDollars.toFixed(2)}{passedCouponCode ? ` with ${passedCouponCode}` : '!'}
                </div>
              </>
            )}

            {/* Spacing when no coupon */}
            <div style={{ marginBottom: hasDiscount ? 12 : 22 }} />

            {/* Selected options recap */}
            <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: C.muted }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Type</span>
                <span style={{ color: C.dark, fontWeight: 600 }}>
                  {ORDER_TYPES.find(t => t.value === orderType)?.label ?? orderType}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Payment</span>
                <span style={{ color: C.dark, fontWeight: 600 }}>
                  {PAYMENT_METHODS.find(p => p.value === paymentMethod)?.label ?? paymentMethod}
                </span>
              </div>
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                background: '#FEF2F2', border: '1px solid #FCA5A5',
                borderRadius: 9, padding: '10px 13px', marginBottom: 14,
                fontSize: 13, color: '#B91C1C',
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* CTA */}
            <button
              className="or-place-btn"
              onClick={handlePlaceOrder}
              disabled={loading || isEmpty}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'or-spin 0.8s linear infinite' }} />
                  Placing Order…
                </>
              ) : (
                <>Place Order · ${totalDollars.toFixed(2)}</>
              )}
            </button>

            <style>{`
              @keyframes or-spin { to { transform: rotate(360deg); } }
            `}</style>

            <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 10, marginBottom: 0 }}>
              Est. ready in ~{EST_MINUTES} min
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

/* ── Review Item Row ─────────────────────────────────────────────── */
const ReviewItemRow = ({ item, onQty, onRemove }) => {
  const addonSum      = (item.addons ?? []).reduce((s, a) => s + Number(a.price ?? 0), 0);
  const unitPriceAll  = item.price + addonSum;           // base + addons per unit
  const lineTotal     = unitPriceAll * (item.quantity ?? 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
      {/* Thumbnail */}
      <div style={{ width: 64, height: 64, borderRadius: 10, flexShrink: 0, overflow: 'hidden', background: '#F3F4F6' }}>
        {item.image ? (
          <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag size={22} color="#D1D5DB" />
          </div>
        )}
      </div>

      {/* Name + addons + price */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </p>
        {/* Addon chips */}
        {item.addons && item.addons.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
            {item.addons.map((a) => (
              <span
                key={a.addonId ?? a.name}
                style={{
                  fontSize: 10, fontWeight: 500,
                  background: 'rgba(230,57,70,0.09)', color: C.primary,
                  padding: '1px 6px', borderRadius: 7,
                }}
              >
                +{a.name}{a.price > 0 ? ` $${Number(a.price).toFixed(2)}` : ''}
              </span>
            ))}
          </div>
        )}
        <p style={{ fontSize: 13, fontWeight: 600, color: C.primary, margin: 0 }}>
          ${lineTotal.toFixed(2)}
          {(item.quantity ?? 1) > 1 && (
            <span style={{ fontSize: 11, fontWeight: 400, color: C.muted, marginLeft: 4 }}>
              (${unitPriceAll.toFixed(2)} each)
            </span>
          )}
          {addonSum > 0 && (
            <span style={{ fontSize: 11, fontWeight: 400, color: C.muted, marginLeft: 6 }}>
              incl. ${addonSum.toFixed(2)} addons
            </span>
          )}
        </p>
      </div>

      {/* Qty stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <button className="or-qty-btn" onClick={() => onQty(item.id, (item.quantity ?? 1) - 1)} aria-label="Decrease">
          <Minus size={12} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.dark, minWidth: 20, textAlign: 'center' }}>
          {item.quantity ?? 1}
        </span>
        <button className="or-qty-btn" onClick={() => onQty(item.id, (item.quantity ?? 1) + 1)} aria-label="Increase">
          <Plus size={12} />
        </button>
        <button className="or-remove-btn" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

/* ── Summary Row ─────────────────────────────────────────────────── */
const SummaryRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
    <span style={{ fontSize: 14, color: '#6B7280' }}>{label}</span>
    <span style={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>
      ${Number(value).toFixed(2)}
    </span>
  </div>
);

export default OrderReviewPage;

