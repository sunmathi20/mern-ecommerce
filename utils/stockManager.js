import Product from '../models/productModel.js';

/**
 * Atomically reserve/deduct inventory for an order's items.
 * Uses atomic conditional updates (countInStock >= qty) to prevent overselling
 * under concurrent access even without replica set transactions.
 * If any product in the order lacks sufficient stock, all previously decremented
 * items in the loop are rolled back immediately.
 *
 * @param {Array} orderItems - Array of items with { product, qty, name }
 * @returns {Promise<boolean>} true on successful deduction
 */
export const reserveStockForOrder = async (orderItems) => {
  const decremented = [];

  try {
    for (const item of orderItems) {
      const productId = item.product || item._id;
      const qty = Number(item.qty) || 1;

      // Atomic conditional decrement
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: productId, countInStock: { $gte: qty } },
        { $inc: { countInStock: -qty } },
        { new: true }
      );

      if (!updatedProduct) {
        throw new Error(
          `Insufficient stock for "${item.name || productId}". Requested: ${qty}`
        );
      }

      decremented.push({ productId, qty });
    }

    return true;
  } catch (error) {
    // Roll back any previously decremented items to ensure atomicity
    for (const dec of decremented) {
      try {
        await Product.findByIdAndUpdate(dec.productId, {
          $inc: { countInStock: dec.qty },
        });
      } catch (rollbackErr) {
        console.error('Failed to rollback stock for product:', dec.productId, rollbackErr);
      }
    }
    throw error;
  }
};

/**
 * Release/restore inventory for an order's items back to the product catalog.
 * Guarantees idempotency: checks `order.stockDeducted`. If false, does nothing,
 * ensuring stock is never restored more than once.
 *
 * @param {Object} order - Mongoose Order document
 * @returns {Promise<boolean>} true if stock was restored, false if already restored/not deducted
 */
export const releaseStockForOrder = async (order) => {
  if (!order || !order.stockDeducted) {
    return false; // Idempotent guard: prevents duplicate restoration
  }

  for (const item of order.orderItems) {
    const productId = item.product || item._id;
    const qty = Number(item.qty) || 1;
    await Product.findByIdAndUpdate(productId, {
      $inc: { countInStock: qty },
    });
  }

  order.stockDeducted = false;
  return true;
};
