/* ─────────────────────────────────────────────────────────────────
   CartPage — two-column layout (items left, summary right).

   Desktop: 65 % items list  |  35 % sticky summary
   Mobile:  items stack → summary below

   Colors/shadows/radii match the existing site theme.
   ───────────────────────────────────────────────────────────────── */

import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Loader2, CheckCircle2, Banknote, CreditCard, Utensils, Package } from 'lucide-react';
import { CartContext } from '../context/CartContext';
import { useRestaurant } from '../context/RestaurantContext';
import { validateCoupon, placeOrder, buildOrderPayload } from '../services/orderService';
import { getTablesByRestaurant } from '../services/tableService';
import { initPayment } from '../services/paymentService';

/* ── Theme ── */
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



const CartPage = () => {
  const { cart, removeFromCart, updateQuantity, clearCart, cartTotal } = useContext(CartContext);
  const navigate  = useNavigate();

  /* Detect active restaurant so empty-cart CTA goes to the right menu */
  const { currentRestaurant } = useRestaurant();
  const restaurantId = currentRestaurant?.id ?? currentRestaurant?._id ?? null;
  const menuLink = restaurantId ? `/restaurant/${restaurantId}/menu` : '/menu';

  // ── Coupon state ──────────────────────────────────────────────
  const [couponInput,          setCouponInput         ] = useState('');
  const [isValidating,         setIsValidating        ] = useState(false);
  const [couponError,          setCouponError         ] = useState('');
  const [isCouponApplied,      setIsCouponApplied     ] = useState(false);
  const [couponCode,           setCouponCode          ] = useState('');
  /**
   * couponData — raw benefit object returned by backend:
   *   { originalAmount: number, discountAmount: number, finalAmount: number }
   *   All values are integer cents.
   */
  const [couponData,           setCouponData          ] = useState(null);
  const [cartChangedMsg,       setCartChangedMsg      ] = useState('');
  const [paymentMethod,        setPaymentMethod       ] = useState('cash'); // 'cash' | 'online'
  const [orderType,            setOrderType           ] = useState('dine-in'); // 'dine-in' | 'takeaway'
  const [couponId,             setCouponId            ] = useState(null); // UUID from backend

  // ── Table selection (dine-in only) ───────────────────────────
  const [tables,               setTables              ] = useState([]);
  const [tablesLoading,        setTablesLoading       ] = useState(false);
  const [tablesError,          setTablesError         ] = useState('');
  const [selectedTableId,      setSelectedTableId     ] = useState(null);
  const [showConfirmModal,     setShowConfirmModal    ] = useState(false);
  const [additionalNotes,      setAdditionalNotes     ] = useState('');
  const [isPlacingOrder,       setIsPlacingOrder      ] = useState(false);
  const [orderPlaceError,      setOrderPlaceError     ] = useState('');

  useEffect(() => {
    if (orderType !== 'dine-in' || !restaurantId) {
      setTables([]);
      setSelectedTableId(null);
      return;
    }
    let cancelled = false;
    setTablesLoading(true);
    setTablesError('');
    getTablesByRestaurant(restaurantId)
      .then((data) => { if (!cancelled) setTables(data); })
      .catch(() => { if (!cancelled) setTablesError('Could not load tables.'); })
      .finally(() => { if (!cancelled) setTablesLoading(false); });
    return () => { cancelled = true; };
  }, [orderType, restaurantId]);

  // ── Derived totals (all in cents, display converts /100) ──────
  const subtotal            = cartTotal;                      // integer
  const originalTotalCents  = subtotal;                         // no tax / service fee
  const discountAmountCents = couponData?.discountAmount ?? 0;
  const finalTotalCents     = couponData?.finalAmount    ?? originalTotalCents;
  const isEmpty             = cart.length === 0;

  // ── Reset coupon whenever cart contents change ─────────────────
  const prevCartLengthRef = useRef(cart.length);
  useEffect(() => {
    if (cart.length !== prevCartLengthRef.current) {
      prevCartLengthRef.current = cart.length;
      if (isCouponApplied) {
        // Coupon was active — must reset because orderAmount changed
        setCouponInput('');
        setCouponError('');
        setIsCouponApplied(false);
        setCouponCode('');
        setCouponData(null);
        setCouponId(null);
        setCartChangedMsg('Cart updated. Please reapply your coupon.');
        const t = setTimeout(() => setCartChangedMsg(''), 5000);
        return () => clearTimeout(t);
      }
    }
  }, [cart, isCouponApplied]);

  // Helper: reset all coupon state
  const removeCoupon = () => {
    setIsCouponApplied(false);
    setCouponCode('');
    setCouponData(null);
    setCouponInput('');
    setCouponError('');
    setCartChangedMsg('');
    setCouponId(null);
  };

  // ── Apply coupon via API ───────────────────────────────────────
  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    setCouponError('');
    setIsValidating(true);
    try {
      const res = await validateCoupon({
        code,
        orderAmount: originalTotalCents,
        restaurantId: restaurantId ?? '',
      });

      // Backend must return benefit.originalAmount / benefit.discountAmount / benefit.finalAmount
      // (all integer cents). Fall back to top-level fields for looser backends.
      const benefit = res?.benefit ?? res;
      const origAmt  = Number(benefit?.originalAmount ?? originalTotalCents);
      const discAmt  = Number(benefit?.discountAmount  ?? 0);
      const finalAmt = Number(benefit?.finalAmount     ?? (origAmt - discAmt));
      // Capture coupon UUID if backend returns it (e.g. res.couponId or res.id)
      const resolvedCouponId = res?.couponId ?? res?.id ?? res?.benefit?.couponId ?? null;

      setCouponData({ originalAmount: origAmt, discountAmount: discAmt, finalAmount: finalAmt });
      setCouponCode(code);
      setCouponId(resolvedCouponId);
      setIsCouponApplied(true);
      setCouponError('');
      setCartChangedMsg('');
    } catch (err) {
      removeCoupon();
      setCouponError(err?.message || 'Invalid or expired coupon.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div
      style={{
        minHeight:       'calc(100vh - 80px)',
        backgroundColor: C.bg,
        padding:         '28px 16px 60px',
      }}
    >
      <style>{`
        .cp-qty-btn {
          width: 30px; height: 30px; border-radius: 8px;
          border: 1.5px solid ${C.border}; background: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: ${C.dark}; flex-shrink: 0;
          transition: border-color 0.15s, background-color 0.15s;
        }
        .cp-qty-btn:hover { border-color: ${C.primary}; background: rgba(45,190,96,0.06); }
        .cp-remove-btn {
          border: none; background: none; cursor: pointer; padding: 6px 7px;
          border-radius: 8px; color: #9CA3AF;
          transition: color 0.15s, background-color 0.15s;
          display: flex; align-items: center;
        }
        .cp-remove-btn:hover { color: #EF4444; background: #FEF2F2; }
        .cp-checkout-btn {
          width: 100%; padding: 14px;
          background: ${C.primary}; color: #fff;
          border: none; border-radius: 11px;
          font-size: 15px; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background-color 0.2s, transform 0.15s;
          box-shadow: 0 4px 16px rgba(45,190,96,0.30);
        }
        .cp-checkout-btn:hover:not(:disabled) {
          background: ${C.primaryHover}; transform: scale(1.01);
        }
        .cp-checkout-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
        .cp-coupon-input {
          flex: 1; padding: 10px 13px;
          border: 1.5px solid ${C.border}; border-radius: 9px;
          font-size: 14px; color: ${C.dark}; background: #fff; outline: none;
          transition: border-color 0.2s;
        }
        .cp-coupon-input:focus { border-color: ${C.primary}; }
        .cp-apply-btn {
          padding: 10px 16px; border-radius: 9px;
          background: ${C.primary}; color: #fff; border: none;
          font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap;
          transition: background-color 0.2s;
        }
        .cp-apply-btn:hover { background: ${C.primaryHover}; }
        .cp-apply-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        @keyframes cp-spin { to { transform: rotate(360deg); } }
        @keyframes cp-total-pop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        .cp-total-animate { animation: cp-total-pop 0.35s ease; }
        @media (max-width: 740px) {
          .cart-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Page title ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto 24px' }}>
        <h1 style={{
          fontSize: 24, fontWeight: 700, color: C.dark,
          margin: 0, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <ShoppingCart size={24} color={C.primary} />
          Your Cart
          {!isEmpty && (
            <span style={{ fontSize: 14, fontWeight: 500, color: C.muted, marginLeft: 4 }}>
              ({cart.length} {cart.length === 1 ? 'item' : 'items'})
            </span>
          )}
        </h1>
      </div>

      {/* ── Main content grid ── */}
      <div
        className="cart-grid"
        style={{
          maxWidth:            1100,
          margin:              '0 auto',
          display:             'grid',
          gridTemplateColumns: isEmpty ? '1fr' : 'minmax(0,1fr) 340px',
          gap:                 24,
          alignItems:          'start',
        }}
      >
        {/* ══════════════════════════════════════════
            LEFT — Cart items
           ══════════════════════════════════════════ */}
        <div>
          {isEmpty ? (
            <div style={{
              background: C.cardBg, borderRadius: 16, boxShadow: C.shadow,
              padding: '64px 32px', textAlign: 'center',
            }}>
              <ShoppingBag size={60} color="#D1D5DB" style={{ marginBottom: 18 }} />
              <h2 style={{ fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 8 }}>
                Your cart is empty
              </h2>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>
                Browse our menu and add something delicious!
              </p>
              <button
                onClick={() => navigate(menuLink)}
                style={{
                  padding: '11px 28px', borderRadius: 10,
                  background: C.primary, color: '#fff', border: 'none',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(230,57,70,0.28)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.primaryHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = C.primary)}
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cart.map((item) => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  onRemove={removeFromCart}
                  onQty={updateQuantity}
                />
              ))}

              {/* Clear all */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  onClick={clearCart}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: '#9CA3AF',
                    display: 'flex', alignItems: 'center', gap: 5,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
                >
                  <Trash2 size={13} /> Clear cart
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════
            RIGHT — Order Summary (sticky)
           ══════════════════════════════════════════ */}
        {!isEmpty && (
          <div style={{ position: 'sticky', top: 96 }}>
            <div style={{
              background: C.cardBg, borderRadius: 16,
              boxShadow: C.shadowStrong, padding: '24px 22px',
            }}>
              <h2 style={{
                fontSize: 17, fontWeight: 700, color: C.dark,
                marginTop: 0, marginBottom: 20,
              }}>
                Order Summary
              </h2>

              {/* ── Order Total (always visible) ── */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isCouponApplied && discountAmountCents > 0 ? 10 : 20 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Order Total</span>
                {isCouponApplied && discountAmountCents > 0 ? (
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.muted, textDecoration: 'line-through' }}>
                    ${Number(originalTotalCents).toFixed(2)}
                  </span>
                ) : (
                  <span style={{ fontSize: 20, fontWeight: 800, color: C.primary }}>
                    ${Number(finalTotalCents).toFixed(2)}
                  </span>
                )}
              </div>

              {/* ── Discount + Payable (only when coupon applied) ── */}
              {isCouponApplied && discountAmountCents > 0 && (
                <>
                  {/* Discount row */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#F0FDF4', borderRadius: 8, padding: '8px 11px', marginBottom: 10,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#15803D', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>🏷️</span> Discount ({couponCode})
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#15803D' }}>
                      −${Number(discountAmountCents).toFixed(2)}
                    </span>
                  </div>

                  {/* Second divider */}
                  <div style={{ height: 1, background: C.border, margin: '4px 0 12px' }} />

                  {/* Amount Payable — prominent */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'rgba(230,57,70,0.05)', borderRadius: 10,
                    padding: '10px 12px', marginBottom: 10,
                  }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Amount Payable</span>
                    <span
                      key={finalTotalCents}
                      className="cp-total-animate"
                      style={{ fontSize: 22, fontWeight: 800, color: C.primary }}
                    >
                      ${Number(finalTotalCents).toFixed(2)}
                    </span>
                  </div>

                  {/* Savings badge */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: '#DCFCE7', borderRadius: 9, padding: '8px 12px', marginBottom: 16,
                  }}>
                    <CheckCircle2 size={14} color="#16A34A" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#15803D' }}>
                      🎉 You saved ${Number(discountAmountCents).toFixed(2)} with {couponCode}!
                    </span>
                  </div>
                </>
              )}

              {/* ── Payment Method ── */}
              <div style={{ marginBottom: 18 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 10 }}>Payment Method</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { key: 'cash',   label: 'Cash',    Icon: Banknote },
                    { key: 'online', label: 'Online',  Icon: CreditCard },
                  ].map(({ key, label, Icon }) => {
                    const active = paymentMethod === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setPaymentMethod(key)}
                        style={{
                          flex: 1, padding: '10px 8px',
                          border: `2px solid ${active ? C.primary : C.border}`,
                          borderRadius: 11,
                          background: active ? 'rgba(230,57,70,0.06)' : '#fff',
                          cursor: 'pointer',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', gap: 6,
                          transition: 'border-color 0.2s, background-color 0.2s',
                        }}
                      >
                        <Icon size={20} color={active ? C.primary : C.muted} strokeWidth={1.8} />
                        <span style={{
                          fontSize: 12, fontWeight: active ? 700 : 500,
                          color: active ? C.primary : C.muted,
                        }}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Order Type ── */}
              <div style={{ marginBottom: 18 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 10 }}>Order Type</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { key: 'dine-in',  label: 'Dine In',  Icon: Utensils },
                    { key: 'takeaway', label: 'Parcel', Icon: Package  },
                  ].map(({ key, label, Icon }) => {
                    const active = orderType === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setOrderType(key)}
                        style={{
                          flex: 1, padding: '10px 8px',
                          border: `2px solid ${active ? C.primary : C.border}`,
                          borderRadius: 11,
                          background: active ? 'rgba(230,57,70,0.06)' : '#fff',
                          cursor: 'pointer',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', gap: 6,
                          transition: 'border-color 0.2s, background-color 0.2s',
                        }}
                      >
                        <Icon size={20} color={active ? C.primary : C.muted} strokeWidth={1.8} />
                        <span style={{
                          fontSize: 12, fontWeight: active ? 700 : 500,
                          color: active ? C.primary : C.muted,
                        }}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Table selector (dine-in only) ── */}
              {orderType === 'dine-in' && (
                <div style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 10 }}>Select Table</p>
                  {tablesLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 13 }}>
                      <Loader2 size={14} style={{ animation: 'cp-spin 0.7s linear infinite' }} />
                      Loading tables…
                    </div>
                  ) : tablesError ? (
                    <p style={{ fontSize: 12, color: '#EF4444', margin: 0 }}>⚠ {tablesError}</p>
                  ) : tables.length === 0 ? (
                    <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>No tables available.</p>
                  ) : (
                    <select
                      value={selectedTableId ?? ''}
                      onChange={(e) => setSelectedTableId(e.target.value || null)}
                      style={{
                        width: '100%', padding: '10px 13px',
                        border: `1.5px solid ${C.border}`, borderRadius: 10,
                        fontSize: 13, color: C.dark, background: '#fff',
                        outline: 'none', cursor: 'pointer',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = C.primary)}
                      onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
                    >
                      <option value="">Select a table…</option>
                      {tables.map((t) => (
                        <option key={t.id} value={t.id}>
                          Table {t.tableNumber} — Capacity: {t.capacity}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* ── Coupon section ── */}
              <div style={{ marginBottom: 18 }}>
                {/* Cart-changed warning */}
                {cartChangedMsg && (
                  <div style={{
                    background: '#FEF9C3', border: '1px solid #FDE047',
                    borderRadius: 8, padding: '7px 11px', marginBottom: 10,
                    fontSize: 12, color: '#854D0E', display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ fontSize: 14 }}>⚠️</span> {cartChangedMsg}
                  </div>
                )}

                {isCouponApplied ? (
                  /* Applied coupon badge */
                  <div style={{
                    border: `1.5px solid #86EFAC`,
                    borderRadius: 10, padding: '10px 13px',
                    background: '#F0FDF4',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={16} color="#16A34A" />
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#15803D', letterSpacing: '0.3px' }}>
                          {couponCode} applied
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: '#16A34A' }}>
                          Saving ${Number(discountAmountCents).toFixed(2)} on this order
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={removeCoupon}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: 600, color: '#DC2626',
                        padding: '4px 8px', borderRadius: 6,
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  /* Input row */
                  <>
                    <p style={{ fontSize: 12, fontWeight: 500, color: C.muted, marginBottom: 7 }}>
                      Have a coupon?
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="cp-coupon-input"
                        placeholder="Enter coupon code"
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value); setCouponError(''); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') applyCoupon(); }}
                      />
                      <button
                        className="cp-apply-btn"
                        onClick={applyCoupon}
                        disabled={isValidating}
                        style={isValidating ? { opacity: 0.7, cursor: 'not-allowed', minWidth: 64 } : { minWidth: 64 }}
                      >
                        {isValidating
                          ? <Loader2 size={14} style={{ animation: 'cp-spin 0.7s linear infinite' }} />
                          : 'Apply'}
                      </button>
                    </div>
                    {couponError && (
                      <p style={{ fontSize: 12, color: '#EF4444', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 14 }}>⚠</span> {couponError}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Checkout CTA */}
              <button
                className="cp-checkout-btn"
                disabled={isEmpty}
                onClick={() => setShowConfirmModal(true)}
              >
              Proceed<ArrowRight size={16} />
              </button>

              {/* Continue shopping */}
              <button
                onClick={() => navigate('/menu')}
                style={{
                  width: '100%', marginTop: 10, padding: 10,
                  background: 'none', border: `1.5px solid ${C.border}`,
                  borderRadius: 11, fontSize: 13, fontWeight: 500,
                  color: C.muted, cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s',
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
                + Add more items
              </button>
            </div>
          </div>
        )}
      </div>

    {/* ══════════════════════════════════════════
        Confirm Order Modal
       ══════════════════════════════════════════ */}
    {showConfirmModal && (
      <div
        onClick={() => setShowConfirmModal(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff', borderRadius: 18,
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            width: '100%', maxWidth: 420,
            maxHeight: '75vh',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* ── Sticky header ── */}
          <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.dark, margin: '0 0 18px', textAlign: 'center' }}>
              Order Summary
            </h2>
          </div>

          {/* ── Scrollable body ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>

          {/* Items list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {cart.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: C.dark, flex: 1, marginRight: 8 }}>
                  <span style={{ fontWeight: 700 }}>{item.quantity ?? 1}×</span> {item.name}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.dark, flexShrink: 0 }}>
                  ${((item.price + (item.addons ?? []).reduce((s, a) => s + Number(a.price ?? 0), 0)) * (item.quantity ?? 1)).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: C.border, marginBottom: 14 }} />

          {/* Totals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
            {isCouponApplied && discountAmountCents > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#15803D' }}>Discount ({couponCode})</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#15803D' }}>−${Number(discountAmountCents).toFixed(2)}</span>
              </div>
            )}
            <div style={{ height: 1, background: C.border, margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Total</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: C.primary }}>${Number(finalTotalCents).toFixed(2)}</span>
            </div>
          </div>

          {/* Meta chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
            <span style={{
              fontSize: 12, fontWeight: 600,
              background: 'rgba(230,57,70,0.08)', color: C.primary,
              padding: '4px 10px', borderRadius: 20,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {paymentMethod === 'cash' ? <Banknote size={13} /> : <CreditCard size={13} />}
              {paymentMethod === 'cash' ? 'Cash' : 'Online'}
            </span>
            <span style={{
              fontSize: 12, fontWeight: 600,
              background: 'rgba(230,57,70,0.08)', color: C.primary,
              padding: '4px 10px', borderRadius: 20,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {orderType === 'dine-in' ? <Utensils size={13} /> : <Package size={13} />}
              {orderType === 'dine-in' ? 'Dine In' : 'Parcel'}
            </span>
            {orderType === 'dine-in' && selectedTableId && (() => {
              const t = tables.find((tb) => tb.id === selectedTableId);
              return t ? (
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  background: 'rgba(230,57,70,0.08)', color: C.primary,
                  padding: '4px 10px', borderRadius: 20,
                }}>
                  Table {t.tableNumber}
                </span>
              ) : null;
            })()}
          </div>

          {/* Additional Notes */}
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 8 }}>Additional Notes</p>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any special instructions or requests…"
              rows={3}
              style={{
                width: '100%', padding: '10px 13px',
                border: `1.5px solid ${C.border}`, borderRadius: 10,
                fontSize: 13, color: C.dark, background: '#fff',
                outline: 'none', resize: 'vertical',
                fontFamily: 'inherit', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = C.primary)}
              onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
            />
          </div>

          </div>

          {/* ── Sticky footer ── */}
          <div style={{ padding: '16px 24px 24px', flexShrink: 0, borderTop: `1px solid ${C.border}` }}>
            {orderPlaceError && (
              <div style={{
                background: '#FEF2F2', border: '1px solid #FECACA',
                borderRadius: 9, padding: '9px 13px', marginBottom: 12,
                fontSize: 13, color: '#DC2626',
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
                <span style={{ fontSize: 16 }}>⚠</span> {orderPlaceError}
              </div>
            )}
            <button
            onClick={async () => {
              setOrderPlaceError('');
              setIsPlacingOrder(true);
              try {
                const payload = buildOrderPayload({
                  restaurantId,
                  orderType:     orderType === 'dine-in' ? 'DINE_IN' : 'TAKEAWAY',
                  paymentMethod: paymentMethod === 'cash' ? 'CASH' : 'ONLINE_PAYMENT',
                  totalPrice:    finalTotalCents,
                  cartItems:     cart,
                  ...(orderType === 'dine-in' && selectedTableId ? { tableId: selectedTableId } : {}),
                  ...(isCouponApplied && couponId             ? { couponId }                  : {}),
                  ...(additionalNotes.trim()                   ? { notes: additionalNotes.trim() } : {}),
                });
                console.log('[CartPage] Placing order with payload:', payload);
                const res = await placeOrder(payload);
                const data = res?.data ?? res;
                const orderId = data?.data?.id ?? data?.data?.orderId ?? data?.id ?? data?.orderId ?? null;
                clearCart();
                setShowConfirmModal(false);

                if (paymentMethod === 'online') {
                  // Initiate online payment session
                  const payRes = await initPayment({
                    orderId,
                    amount: finalTotalCents,
                    restaurantId,
                  });
                  console.log ('payres', payRes);
                  const paymentUrl = payRes.data.gatewayUrl ?? payRes?.paymentUrl ?? payRes?.data?.paymentUrl ?? payRes?.url ?? payRes?.data?.url ?? null;
                  if (paymentUrl) {
                    window.location.href = paymentUrl;
                    return;
                  }
                }

                navigate('/order-confirmation', {
                  state: {
                    orderId,
                    orderType:     orderType === 'dine-in' ? 'DINE_IN' : 'TAKEAWAY',
                    paymentMethod: paymentMethod === 'cash' ? 'CASH' : 'ONLINE_PAYMENT',
                    total:         finalTotalCents,
                  },
                });
              } catch (err) {
                setOrderPlaceError(err?.message || 'Failed to place order. Please try again.');
              } finally {
                setIsPlacingOrder(false);
              }
            }}
            style={{
              width: '100%', padding: '13px',
              background: C.primary, color: '#fff',
              border: 'none', borderRadius: 11,
              fontSize: 15, fontWeight: 700, cursor: isPlacingOrder ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(230,57,70,0.28)',
              marginBottom: 10,
              opacity: isPlacingOrder ? 0.75 : 1,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.primaryHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = C.primary)}
          >
            {isPlacingOrder
              ? <><Loader2 size={16} style={{ animation: 'cp-spin 0.7s linear infinite' }} /> Placing Order…</>
              : <>{paymentMethod === 'cash' ? 'Confirm Order' : 'Confirm & Pay'} <ArrowRight size={16} /></>}
          </button>
          <button
            onClick={() => { if (!isPlacingOrder) { setShowConfirmModal(false); setOrderPlaceError(''); } }}
            disabled={isPlacingOrder}
            style={{
              width: '100%', padding: '10px',
              background: 'none', border: `1.5px solid ${C.border}`,
              borderRadius: 11, fontSize: 13, fontWeight: 500,
              color: C.muted, cursor: 'pointer',
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
            Back to Cart
          </button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

/* ── Cart Item Card ──────────────────────────────────────────────── */
const CartItemCard = ({ item, onRemove, onQty }) => (
  <div style={{
    background: '#fff', borderRadius: 14,
    boxShadow: '0 2px 12px rgba(31,41,55,0.07)',
    padding: 14, display: 'flex', alignItems: 'center', gap: 14,
  }}>
    {/* Thumbnail */}
    <div style={{
      width: 80, height: 80, borderRadius: 10, flexShrink: 0,
      overflow: 'hidden', background: '#F3F4F6',
    }}>
      {item.image ? (
        <img
          src={item.image} alt={item.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          loading="lazy"
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShoppingBag size={28} color="#D1D5DB" />
        </div>
      )}
    </div>

    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{
        fontSize: 14, fontWeight: 700, color: '#1F2937', margin: '0 0 2px',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {item.name}
      </p>
      {item.category && (
        <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 4px' }}>
          {item.category}
        </p>
      )}
      {/* Addon chips */}
      {item.addons && item.addons.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {item.addons.map((a) => (
            <span
              key={a.addonId ?? a.name}
              style={{
                fontSize: 11, fontWeight: 500,
                background: 'rgba(230,57,70,0.09)', color: '#E63946',
                padding: '1px 7px', borderRadius: 8,
              }}
            >
              +{a.name}{a.price > 0 ? ` $${Number(a.price).toFixed(2)}` : ''}
            </span>
          ))}
        </div>
      )}
      {/* Addon-inclusive total price */}
      <p style={{ fontSize: 14, fontWeight: 700, color: '#E63946', margin: 0 }}>
        ${((item.price + (item.addons ?? []).reduce((s, a) => s + Number(a.price ?? 0), 0)) * (item.quantity ?? 1)).toFixed(2)}
      </p>
    </div>

    {/* Qty stepper + remove */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <button
        className="cp-qty-btn"
        onClick={() => onQty(item.id, (item.quantity ?? 1) - 1)}
        aria-label="Decrease quantity"
      >
        <Minus size={13} />
      </button>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', minWidth: 20, textAlign: 'center' }}>
        {item.quantity ?? 1}
      </span>
      <button
        className="cp-qty-btn"
        onClick={() => onQty(item.id, (item.quantity ?? 1) + 1)}
        aria-label="Increase quantity"
      >
        <Plus size={13} />
      </button>
      <button
        className="cp-remove-btn"
        onClick={() => onRemove(item.id)}
        aria-label={`Remove ${item.name}`}
      >
        <Trash2 size={15} />
      </button>
    </div>
  </div>
);

/* ── Summary Row ─────────────────────────────────────────────────── */
const SummaryRow = ({ label, value }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  }}>
    <span style={{ fontSize: 14, color: '#6B7280' }}>{label}</span>
    <span style={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>
      ${Number(value).toFixed(2)}
    </span>
  </div>
);

export default CartPage;
