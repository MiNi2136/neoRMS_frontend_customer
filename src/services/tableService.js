/* ─────────────────────────────────────────────────────────────────
   Table Service — table-related API calls.
   Uses apiClient so auth + tenant headers are auto-attached.
   ───────────────────────────────────────────────────────────────── */

import apiClient from './apiClient';

/**
 * Fetch all tables for a given restaurant.
 * GET /table/:restaurantId
 *
 * Returns the data array from the backend envelope:
 *   { success, data: [ { id, tableNumber, capacity, ... } ] }
 */
export const getTablesByRestaurant = (restaurantId) =>
  apiClient
    .get(`/table/${restaurantId}`)
    .then((res) => {
      const payload = res?.data ?? res;
      console.log('table', payload);
      return Array.isArray(payload) ? payload : [];
    });

/**
 * Reserve a table.
 * POST /table/reserve/:tableId
 *
 * @param {string} tableId
 * @param {{ scheduledFor: string, duration: number, partySize: number, notes?: string, contactPhone: string }} payload
 */
export const reserveTable = (tableId, payload) =>
  apiClient.post(`/table/reserve/${tableId}`, payload);