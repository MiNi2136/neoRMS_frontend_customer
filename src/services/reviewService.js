/* ─────────────────────────────────────────────────────────────────
   reviewService — submit product reviews for a completed order.
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
  const res = await apiClient.post('/review', reviewData);
  return res.data;
};
