import Order from '../models/orderModel.js';
import { releaseStockForOrder } from '../utils/stockManager.js';

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
export const updateOrderToPaid = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // Only the order owner can pay
    if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      res.status(403);
      throw new Error('Not authorized to pay for this order');
    }

    // Prevent double payment
    if (order.isPaid) {
      res.status(400);
      throw new Error('Order is already paid');
    }

    // COD orders don't go through online payment
    if (order.paymentMethod === 'COD') {
      res.status(400);
      throw new Error('COD orders are paid on delivery, not online');
    }

    // Validate payment result from the request body
    const { id, status, update_time, email_address } = req.body;

    if (!id || !status) {
      res.status(400);
      throw new Error('Payment result is required (id and status)');
    }

    // Update order payment status
    order.isPaid = true;
    order.paidAt = Date.now();
    order.status = 'PAID';
    order.paymentResult = {
      id,
      status,
      update_time: update_time || new Date().toISOString(),
      email_address: email_address || '',
    };

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    next(error);
  }
};

// @desc    Simulate a successful test payment (DEVELOPMENT ONLY)
// @route   POST /api/payment/simulate-success
// @access  Private (Dev Only)
export const simulatePaymentSuccess = async (req, res, next) => {
  try {
    // CRITICAL: Block in production
    if (process.env.NODE_ENV === 'production') {
      res.status(403);
      throw new Error('Payment simulation is not available in production');
    }

    const { orderId } = req.body;

    if (!orderId) {
      res.status(400);
      throw new Error('Order ID is required');
    }

    const order = await Order.findById(orderId);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // Only the order owner can simulate payment
    if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      res.status(403);
      throw new Error('Not authorized');
    }

    if (order.isPaid) {
      res.status(400);
      throw new Error('Order is already paid');
    }

    // Simulate successful payment
    order.isPaid = true;
    order.paidAt = Date.now();
    order.status = 'PAID';
    order.paymentResult = {
      id: `TEST_PAY_${Date.now()}`,
      status: 'COMPLETED',
      update_time: new Date().toISOString(),
      email_address: 'test@aurelia-dev.com',
    };

    const updatedOrder = await order.save();

    res.json({
      success: true,
      message: 'TEST PAYMENT — Payment simulation successful. No real money was charged.',
      order: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Simulate a failed test payment (DEVELOPMENT ONLY)
// @route   POST /api/payment/simulate-failure
// @access  Private (Dev Only)
export const simulatePaymentFailure = async (req, res, next) => {
  try {
    // CRITICAL: Block in production
    if (process.env.NODE_ENV === 'production') {
      res.status(403);
      throw new Error('Payment simulation is not available in production');
    }

    const { orderId } = req.body;

    if (!orderId) {
      res.status(400);
      throw new Error('Order ID is required');
    }

    const order = await Order.findById(orderId);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // Simulate failed payment — order transitions to PAYMENT_FAILED and reserved stock is released
    await releaseStockForOrder(order);
    order.status = 'PAYMENT_FAILED';
    const updatedOrder = await order.save();

    res.json({
      success: false,
      message: 'TEST PAYMENT — Payment simulation failed. This is a test failure. Reserved stock has been released back to catalog.',
      order: {
        _id: updatedOrder._id,
        isPaid: false,
        status: updatedOrder.status,
      },
    });
  } catch (error) {
    next(error);
  }
};
