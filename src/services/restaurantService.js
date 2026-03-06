/* ─────────────────────────────────────────────────────────────────
   Restaurant Service — all restaurant-related API calls.
   Uses apiClient (Axios instance) so auth + tenant headers are
   auto-attached on every request.
   ───────────────────────────────────────────────────────────────── */

import apiClient from './apiClient';
import { getToken, getTenantId } from './authService';

/**
 * Fetch all restaurants.
 * GET /restaurant
 */
export const getAllRestaurants = () => apiClient.get('/restaurant');

/**
 * Fetch a single restaurant by its ID.
 * GET /restaurant/:id
 */
export const getRestaurantById = (id) => apiClient.get(`/restaurant/${id}`);

/**
 * Fetch menu products for a specific restaurant.
 * GET /menuProduct/:restaurantId
 *
 * Unwraps the backend envelope { success, data: [...] } and returns the
 * items array directly so callers never need to deal with wrapper objects.
 */
export const getRestaurantMenu = (restaurantId) =>
  apiClient.get(`/menuProduct/${restaurantId}`).then((res) => {
    // Backend may return the array directly, or wrap it:
    // { success, data: [...] }  /  { items: [...] }  /  { menu: [...] }  etc.
    if (Array.isArray(res)) return res;
    return res?.data ?? res?.items ?? res?.menu ?? res?.menuProducts ?? [];
  });

/**
 * Fetch AI recommendations for current cart items.
 * POST /menuProduct/recommendation
 * Body: { cartItems: string[] }
 *
 * IMPORTANT:
 * - Only sends request when token + tenant id are present.
 * - Sends an empty array when cart has no items.
 */
export const getMenuRecommendations = (cartItems = []) => {
  const token = getToken();
  const tenantId = getTenantId();

  if (!token || !tenantId) return Promise.resolve([]);

  const safeItems = Array.isArray(cartItems)
    ? cartItems.filter((item) => typeof item === 'string' && item.trim().length > 0)
    : [];

  return apiClient
    .post('/menuProduct/recommendation', { cartItems: safeItems })
    .then((res) => {
      if (Array.isArray(res)) return res;
      return res?.data ?? res?.recommendations ?? [];
    });
};
