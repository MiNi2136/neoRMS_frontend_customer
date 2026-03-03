/* ─────────────────────────────────────────────────────────────────
   Order Service — API calls related to order placement / history.

   Uses apiClient (Axios instance) so that:
     • Authorization: Bearer <token>   — auto-attached from localStorage
     • x-tenant-id: <tenantId>         — auto-attached from localStorage

   Neither customerId nor tenantId should be included in the request
   body — the backend resolves both from the above headers.
   ───────────────────────────────────────────────────────────────── */

import apiClient from './apiClient';

/**
 * POST /order
 *
 * @param {Object} orderPayload
 * @param {string}   orderPayload.restaurantId
 * @param {string}   orderPayload.orderType           - e.g. "DINE_IN"
 * @param {string}   orderPayload.paymentMethod       - e.g. "CASH"
 * @param {number}   orderPayload.totalPrice
 * @param {string}   [orderPayload.notes]
 * @param {number}   [orderPayload.estimatedDeliveryTimeInMinutes]
 * @param {Array}    orderPayload.items               - [{ menuItemId, quantity, price }]
 *
 * @returns {Promise<Object>} Created order object (includes orderId / id)
 */
/**
 * Normalise raw cart items into the shape the backend expects.
 * Call this before building the order payload — never pass raw cart state
 * directly to placeOrder().
 *
 * @param {Array} cartItems  - items from CartContext
 * @returns {Array}          - cleaned items array ready for the API
 */
export const buildOrderItems = (cartItems) =>
  cartItems.map((item) => ({
    menuItemId: item._id  ?? item.menuItemId ?? item.id ?? '',
    name:       item.name ?? item.title     ?? item.productName ?? '',
    quantity:   item.quantity ?? 1,
    // Backend expects integer cents: $8.46 → 846
    price:      Math.round(Number(item.price ?? 0) * 100),
    // variantId is stored on the cart item by FoodModal from the backend variant object.
    // Never set to undefined — backend validates this field strictly.
    variantId:  item.variantId ?? '',
    notes:      item.notes ?? '',
    ...((item.addons ?? []).length > 0
      ? {
          addons: item.addons.map((a) => ({
            addonId: a.addonId ?? a._id ?? a.id ?? a.name ?? '',
            name:    a.name   ?? '',
            // Backend expects integer cents
            price:   Math.round(Number(a.price ?? 0) * 100),
          })),
        }
      : {}),
  }));

export const placeOrder = (orderPayload) =>
  apiClient.post('/order', orderPayload);

/**
 * POST /coupon/validate
 * Validates a coupon code for a given order amount.
 *
 * @param {{ code: string, orderAmount: number, restaurantId: string }} payload
 *   orderAmount must be an integer in cents (e.g. $8.46 → 846).
 * @returns {Promise<{ discountAmount?: number, discountPercentage?: number, message?: string }>}
 *   discountAmount is returned in integer cents when present.
 */
export const validateCoupon = (payload) =>
  apiClient.post('/coupon/validate', payload);

/**
 * GET /order/:orderId
 * Fetch a single order by its ID.
 */
export const fetchOrder = (orderId) =>
  apiClient.get(`/order/${orderId}`);

/**
 * GET /order/customer-orders
 * Fetch all orders for the logged-in customer.
 * Backend resolves the customer from the Authorization + x-tenant-id headers.
 */
export const fetchMyOrders = () =>
  apiClient.get(`/order/customer-orders?_=${Date.now()}`, {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma':        'no-cache',
    },
  });
