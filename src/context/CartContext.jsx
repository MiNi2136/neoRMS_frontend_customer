/* ─────────────────────────────────────────────────────────────────
   CartContext — cart state with built-in authentication guards.

   Every mutating action (addToCart, removeFromCart, updateQuantity,
   clearCart) checks auth state BEFORE doing anything.  If the user
   is not authenticated the Sign In modal is opened and the action is
   silently cancelled.  UI components never need to repeat this check.
   Cart is automatically cleared when the user logs out.

   Restaurant-awareness:
   addToCart accepts an optional second argument restaurantId.
   If the cart already belongs to a DIFFERENT restaurant the user is
   prompted to confirm — the cart is cleared and the new item added.
   ───────────────────────────────────────────────────────────────── */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AUTH_STATUS, useAuth } from './AuthContext';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart,             setCart            ] = useState([]);
  const [cartRestaurantId, setCartRestaurantId] = useState(null);
  const { status, openAuthModal } = useAuth();

  /* Clear cart automatically when the user logs out */
  useEffect(() => {
    if (status === AUTH_STATUS.UNAUTHENTICATED) {
      setCart([]);
      setCartRestaurantId(null);
    }
  }, [status]);

  /* Open Sign In modal instead of navigating away */
  const requireAuth = useCallback(() => {
    if (status !== AUTH_STATUS.AUTHENTICATED) {
      openAuthModal('signin');
      return false; // action should be cancelled
    }
    return true;
  }, [status, openAuthModal]);

  /* ── Guarded cart actions ──────────────────────────────────── */

  /**
   * Add or increment an item.
   * item must have at least { id, name, price }.
   * restaurantId (optional) — when provided and cart belongs to a
   * different restaurant the user is prompted to start a new cart.
   */
  const addToCart = useCallback((item, restaurantId = null) => {
    if (!requireAuth()) return;

    setCart((prev) => {
      // Switching restaurant — ask user first
      if (restaurantId && cartRestaurantId && restaurantId !== cartRestaurantId) {
        const ok = window.confirm(
          'Your cart contains items from another restaurant.\n\nStart a new cart for this restaurant?'
        );
        if (!ok) return prev; // user cancelled — keep existing cart

        // Clear and start fresh
        setCartRestaurantId(restaurantId);
        return [{ ...item, quantity: 1 }];
      }

      // Normal add / increment
      if (restaurantId && !cartRestaurantId) {
        setCartRestaurantId(restaurantId);
      }
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: (i.quantity ?? 1) + 1 } : i,
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, [requireAuth, cartRestaurantId]);

  /** Remove an item by id. */
  const removeFromCart = useCallback((itemId) => {
    if (!requireAuth()) return;
    setCart((prev) => {
      const next = prev.filter((i) => i.id !== itemId);
      if (next.length === 0) setCartRestaurantId(null);
      return next;
    });
  }, [requireAuth]);

  /** Set a specific quantity (0 removes the item). */
  const updateQuantity = useCallback((itemId, quantity) => {
    if (!requireAuth()) return;
    if (quantity <= 0) {
      setCart((prev) => {
        const next = prev.filter((i) => i.id !== itemId);
        if (next.length === 0) setCartRestaurantId(null);
        return next;
      });
    } else {
      setCart((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
      );
    }
  }, [requireAuth]);

  /** Empty the entire cart. */
  const clearCart = useCallback(() => {
    if (!requireAuth()) return;
    setCart([]);
    setCartRestaurantId(null);
  }, [requireAuth]);

  const cartCount = cart.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
  // cartTotal = sum of (base price + all selected addon prices) × quantity per item
  const cartTotal = cart.reduce((sum, item) => {
    const addonSum = (item.addons ?? []).reduce((s, a) => s + Number(a.price ?? 0), 0);
    return sum + (item.price + addonSum) * (item.quantity ?? 1);
  }, 0);

  const value = {
    cart,
    setCart,
    cartCount,
    cartTotal,
    cartRestaurantId,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

/* Convenience hook */
export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
};
