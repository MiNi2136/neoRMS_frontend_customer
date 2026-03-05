/* ─────────────────────────────────────────────────────────────────
   reviewService — submit and fetch product reviews for orders.
   ───────────────────────────────────────────────────────────────── */

import apiClient from './apiClient';

/**
 * Submit a review for a single menu product.
 *
 * @param {Object} reviewData
 * @param {string} reviewData.menuProductId
 * @param {string} reviewData.orderId
 * @param {number} reviewData.rating        1–5
 * @param {string} reviewData.comment
 */
export const submitReview = async (reviewData) => {
  console.log('in service', reviewData);
  const res = await apiClient.post('/review', reviewData);
  console.log('review res', res);
  return res.data;
};

/**
 * Fetch all reviews submitted by the current user for a specific order.
 * GET /review/my/order/:orderId
 * x-tenant-id and Authorization headers are attached automatically by apiClient.
 *
 * @param {string} orderId
 * @returns {Promise<Array>} array of review objects
 */
export const getReviewsByOrderId = async (orderId) => {
  const res = await apiClient.get(`/review/my/order/${orderId}`);
  // Unwrap common envelope shapes: [], { data: [] }, { reviews: [] }
  return Array.isArray(res) ? res : res?.data ?? res?.reviews ?? [];
};
