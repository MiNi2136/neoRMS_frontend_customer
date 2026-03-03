/* ─────────────────────────────────────────────────────────────────
   Restaurant Service — all restaurant-related API calls.
   Uses apiClient (Axios instance) so auth + tenant headers are
   auto-attached on every request.
   ───────────────────────────────────────────────────────────────── */

import apiClient from './apiClient';

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
