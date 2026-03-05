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
  cartItems.map((item) => {
    const base = {
      menuItemId: item._id  ?? item.menuItemId ?? item.id ?? '',
      name:       item.name ?? item.title     ?? item.productName ?? '',
      quantity:   item.quantity ?? 1,
      // Backend expects integer cents: $8.46 → 846
      price:      item.price ?? 0,
      // variantId is required by the backend — never omit
      variantId:  item.variantId ?? '',
    };
    // Only include notes when non-empty
    if (item.notes?.trim()) base.notes = item.notes.trim();
    // Only include addons when present
    const addons = (item.addons ?? []).filter(Boolean);
    if (addons.length > 0) {
      base.addons = addons.map((a) => ({
        addonId: a.addonId ?? a._id ?? a.id ?? a.name ?? '',
        name:    a.name   ?? '',
        // Backend expects integer cents
        price:   Math.round(Number(a.price ?? 0) * 100),
      }));
    }
    return base;
  });

export const placeOrder = (orderPayload) =>
  apiClient.post('/order', orderPayload);

/**
 * Build the full order payload ready to POST to /order.
 * Omits every optional field that has no value so the backend
 * never receives null / empty-string / undefined for optional keys.
 *
 * @param {Object} opts
 * @param {string}   opts.restaurantId
 * @param {string}   opts.orderType          - 'DINE_IN' | 'TAKEAWAY'
 * @param {string}   opts.paymentMethod      - 'CASH' | 'ONLINE_PAYMENT'
 * @param {number}   opts.totalPrice         - integer cents after discount
 * @param {Array}    opts.cartItems          - raw items from CartContext
 * @param {string}   [opts.tableId]          - required for DINE_IN
 * @param {string}   [opts.couponId]         - UUID returned by /coupon/validate
 * @param {string}   [opts.notes]            - free-text customer notes
 * @param {number}   [opts.estimatedDeliveryTimeInMinutes]
 * @returns {Object} payload ready for placeOrder()
 */
export const buildOrderPayload = ({ restaurantId, orderType, paymentMethod, totalPrice, cartItems, tableId, couponId, notes, estimatedDeliveryTimeInMinutes }) => {
  const payload = {
    restaurantId,
    orderType,
    paymentMethod,
    totalPrice,
    items: buildOrderItems(cartItems),
  };
  if (orderType === 'DINE_IN' && tableId)                  payload.tableId = tableId;
  if (couponId)                                            payload.couponId = couponId;
  if (notes?.trim())                                       payload.notes = notes.trim();
  if (estimatedDeliveryTimeInMinutes != null)              payload.estimatedDeliveryTimeInMinutes = estimatedDeliveryTimeInMinutes;
  return payload;
};

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
