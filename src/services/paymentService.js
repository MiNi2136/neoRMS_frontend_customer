/* ─────────────────────────────────────────────────────────────────
   paymentService — handles payment-related API calls.
   ───────────────────────────────────────────────────────────────── */

import apiClient from './apiClient';

/**
 * Initialise an online payment session for a placed order.
 *
 * POST /payment/init
 *
 * @param {object} params
 * @param {string} params.orderId        - The ID of the successfully placed order.
 * @param {number} [params.amount]       - Total amount (in cents / raw backend units).
 * @param {string} [params.restaurantId] - Optional restaurant context.
 *
 * @returns {Promise<object>} Backend response — typically contains a
 *   `paymentUrl` (redirect) or `sessionId` / `clientSecret` (embedded).
 */
export const initPayment = async ({ orderId, amount, restaurantId } = {}) => {
  const payload = { orderId };
  if (amount       != null) payload.amount       = amount;
  if (restaurantId != null) payload.restaurantId = restaurantId;
  
  const res = await apiClient.post('/payment/init', payload);
  return res;
};
