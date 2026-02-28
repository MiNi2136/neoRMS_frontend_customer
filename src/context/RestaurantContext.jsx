/* ─────────────────────────────────────────────────────────────────
   RestaurantContext

   Provides the currently-selected restaurant to all child components.
   Also exposes `allRestaurants` for the Explore page.

   Usage:
     const { currentRestaurant, setCurrentRestaurant } = useRestaurant();

   `currentRestaurant` shape (mirrors backend response):
   {
     id          : string
     name        : string
     tagline?    : string
     description?: string
     location?   : string
     contactInfo?: string
     bannerImage?: string
   }
   ───────────────────────────────────────────────────────────────── */

import React, { createContext, useContext, useState, useCallback } from 'react';

export const RestaurantContext = createContext(null);

/* ── Storage helpers ── */
const STORAGE_KEY = 'neoRMS_currentRestaurant';

const loadFromStorage = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveToStorage = (restaurant) => {
  try {
    if (restaurant) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(restaurant));
    else            sessionStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore quota errors */ }
};

export const RestaurantProvider = ({ children }) => {
  const [currentRestaurant, _setCurrentRestaurant] = useState(() => loadFromStorage());
  const [allRestaurants,    setAllRestaurants    ] = useState([]);

  /** Set restaurant and persist to sessionStorage so refresh preserves it. */
  const setCurrentRestaurant = useCallback((restaurant) => {
    _setCurrentRestaurant(restaurant);
    saveToStorage(restaurant);
  }, []);

  /** Clear the active restaurant (e.g. when navigating back to the explorer). */
  const clearCurrentRestaurant = useCallback(() => {
    _setCurrentRestaurant(null);
    saveToStorage(null);
  }, []);

  const value = {
    currentRestaurant,
    setCurrentRestaurant,
    allRestaurants,
    setAllRestaurants,
    clearCurrentRestaurant,
  };

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
};

/** Convenience hook */
export const useRestaurant = () => {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error('useRestaurant must be used inside <RestaurantProvider>');
  return ctx;
};
