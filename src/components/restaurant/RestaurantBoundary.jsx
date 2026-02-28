/* ─────────────────────────────────────────────────────────────────
   RestaurantBoundary  —  Route wrapper for /restaurant/:restaurantId

   Responsibilities:
   1. Read restaurantId from URL params
   2. Fetch the restaurant from the API
   3. Push it into RestaurantContext so ALL child pages can read it
   4. Render <Outlet /> on success (stays inside CustomerLayout)
   5. Handle loading / not-found states gracefully
   ───────────────────────────────────────────────────────────────── */

import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { Utensils, ArrowLeft } from 'lucide-react';
import { getRestaurantById } from '../../services/restaurantService';
import { useRestaurant } from '../../context/RestaurantContext';
import { useCart } from '../../context/CartContext';

const C = {
  primary: '#2DBE60',
  dark:    '#1F2937',
  muted:   '#6B7280',
  bg:      '#F4FAF6',
};

/* ── Skeleton pulse ── */
const LoadingState = () => (
  <div style={{ minHeight: 'calc(100vh - 80px)', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <style>{`@keyframes rb-spin { to { transform: rotate(360deg); } }`}</style>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 44, height: 44, border: `3px solid ${C.primary}`,
        borderTopColor: 'transparent', borderRadius: '50%',
        animation: 'rb-spin 0.75s linear infinite', margin: '0 auto 16px',
      }} />
      <p style={{ fontSize: 15, color: C.muted, fontWeight: 500 }}>Loading restaurant…</p>
    </div>
  </div>
);

/* ── Error / not-found state ── */
const ErrorState = ({ message }) => {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: 'calc(100vh - 80px)', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '48px 36px',
        textAlign: 'center', maxWidth: 420, boxShadow: '0 4px 24px rgba(31,41,55,0.10)',
      }}>
        <Utensils size={52} color="#D1D5DB" style={{ marginBottom: 18 }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 8 }}>
          Restaurant Not Found
        </h2>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>
          {message || "We couldn't find this restaurant. It may have been removed or the link is incorrect."}
        </p>
        <button
          onClick={() => navigate('/restaurants')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '11px 24px', borderRadius: 10,
            background: C.primary, color: '#fff', border: 'none',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <ArrowLeft size={15} /> Back to Restaurants
        </button>
      </div>
    </div>
  );
};

/* ── Boundary ── */
const RestaurantBoundary = () => {
  const { restaurantId }                        = useParams();
  const { setCurrentRestaurant }                = useRestaurant();
  const { cart, cartRestaurantId, clearCart }   = useCart();
  const [loading, setLoading]                   = useState(true);
  const [error,   setError  ]                   = useState(null);

  // Refs so the effect always reads the latest cart without needing it as a dep
  const cartRef             = useRef(cart);
  const cartRestaurantIdRef = useRef(cartRestaurantId);
  const clearCartRef        = useRef(clearCart);
  useEffect(() => { cartRef.current             = cart;             }, [cart]);
  useEffect(() => { cartRestaurantIdRef.current = cartRestaurantId; }, [cartRestaurantId]);
  useEffect(() => { clearCartRef.current        = clearCart;        }, [clearCart]);

  useEffect(() => {
    if (!restaurantId) { setError('No restaurant ID provided.'); setLoading(false); return; }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getRestaurantById(restaurantId)
      .then((data) => {
        if (cancelled) return;
        // Normalise: backend may wrap response in { data: {...} }
        const restaurant = data?.data ?? data;
        // Ensure id is accessible as .id (some backends return ._id)
        if (!restaurant.id && restaurant._id) restaurant.id = restaurant._id;

        const incomingId = restaurant.id ?? restaurant._id;

        // If cart has items from a DIFFERENT restaurant, prompt to clear
        if (
          cartRef.current.length > 0 &&
          cartRestaurantIdRef.current &&
          cartRestaurantIdRef.current !== incomingId
        ) {
          const ok = window.confirm(
            'Your cart has items from another restaurant.\n\nClear cart and continue to this restaurant?'
          );
          if (ok) clearCartRef.current();
          // Either way, still load the new restaurant
        }

        setCurrentRestaurant(restaurant);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load restaurant.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      // Do NOT clear currentRestaurant here — doing so would wipe context
      // on every sub-route navigation (menu → cart → menu), causing
      // "No restaurant selected" errors mid-session.
      // Restaurant is cleared explicitly only by clearCurrentRestaurant()
      // (e.g. when the user navigates back to the restaurants list).
    };
  }, [restaurantId, setCurrentRestaurant]);

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState message={error} />;

  return <Outlet />;
};

export default RestaurantBoundary;
