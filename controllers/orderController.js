import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import { reserveStockForOrder, releaseStockForOrder } from '../utils/stockManager.js';

// @desc    Create new order with server-side price calculation and atomic stock reservation
// @route   POST /api/orders
// @access  Private
export const addOrderItems = async (req, res, next) => {
  try {
    const { orderItems, shippingAddress, paymentMethod } = req.body;

    if (!orderItems || orderItems.length === 0) {
      res.status(400);
      throw new Error('No order items provided');
    }

    if (!shippingAddress || !shippingAddress.address || !shippingAddress.city || !shippingAddress.postalCode) {
      res.status(400);
      throw new Error('Shipping address is required');
    }

    // Server-side verification: fetch genuine database prices and check availability
    const verifiedOrderItems = [];
    let computedItemsPrice = 0;

    for (const item of orderItems) {
      const productId = item.product || item._id;
      const product = await Product.findById(productId);

      if (!product) {
        res.status(404);
        throw new Error(`Product not found: ${item.name || productId}`);
      }

      const qty = Number(item.qty) || 1;
      if (product.countInStock < qty) {
        res.status(400);
        throw new Error(`Insufficient stock for "${product.name}". Available: ${product.countInStock}, Requested: ${qty}`);
      }

      // Use the verified database price, never trusting client-submitted prices
      const price = Number(product.price);
      computedItemsPrice += price * qty;

      verifiedOrderItems.push({
        name: product.name,
        qty,
        image: product.image,
        price,
        product: product._id,
      });
    }

    // Atomic stock deduction: reserves inventory for both COD (confirmed immediately)
    // and online gateways (reserved during payment window)
    await reserveStockForOrder(verifiedOrderItems);

    // Server-side financial calculations
    const itemsPrice = Number(computedItemsPrice.toFixed(2));
    const shippingPrice = itemsPrice > 10000 ? 0 : 500;
    const taxPrice = Number((0.18 * itemsPrice).toFixed(2));
    const totalPrice = Number((itemsPrice + shippingPrice + taxPrice).toFixed(2));

    // COD is CONFIRMED immediately; Online payment starts at PENDING_PAYMENT
    const status = paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING_PAYMENT';

    const order = new Order({
      orderItems: verifiedOrderItems,
      user: req.user._id,
      shippingAddress,
      paymentMethod: paymentMethod || 'PayPal',
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      status,
      stockDeducted: true,
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
  } catch (error) {
    next(error);
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'name email'
    );

    if (order) {
      // Check if order belongs to user or if user is admin
      if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized to view this order');
      }
      res.json(order);
    } else {
      res.status(404);
      throw new Error('Order not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order and restore stock (idempotent)
// @route   PUT /api/orders/:id/cancel
// @access  Private
export const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // Only order owner or admin can cancel
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Not authorized to cancel this order');
    }

    // Prevent duplicate cancellation
    if (order.status === 'CANCELLED') {
      res.status(400);
      throw new Error('Order is already cancelled');
    }

    // Delivered orders cannot be cancelled
    if (order.status === 'DELIVERED') {
      res.status(400);
      throw new Error('Delivered orders cannot be cancelled');
    }

    // Restores stock exactly once (idempotent safeguard)
    await releaseStockForOrder(order);

    order.status = 'CANCELLED';
    order.cancelledAt = Date.now();
    order.cancellationReason = req.body.reason || 'Cancelled by customer';

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status, tracking, and fulfillment notes
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, trackingNumber, carrier, adminNotes, isPaid } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    const validStatuses = ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'PAID', 'DELIVERED', 'CANCELLED'];
    if (status && !validStatuses.includes(status)) {
      res.status(400);
      throw new Error(`Invalid status: ${status}`);
    }

    if (status) {
      // If transitioning to CANCELLED, release stock
      if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
        await releaseStockForOrder(order);
        order.cancelledAt = Date.now();
        order.cancellationReason = req.body.reason || 'Cancelled by admin';
      }

      // If transitioning to DELIVERED, mark delivery timestamp
      if (status === 'DELIVERED') {
        order.isDelivered = true;
        order.deliveredAt = Date.now();
        if (order.paymentMethod === 'COD') {
          order.isPaid = true;
          order.paidAt = Date.now();
        }
      }

      // If transitioning to PAID
      if (status === 'PAID' && !order.isPaid) {
        order.isPaid = true;
        order.paidAt = Date.now();
      }

      order.status = status;
    }

    if (isPaid !== undefined) {
      order.isPaid = Boolean(isPaid);
      if (order.isPaid && !order.paidAt) {
        order.paidAt = Date.now();
      }
    }

    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
    if (carrier !== undefined) order.carrier = carrier;
    if (adminNotes !== undefined) order.adminNotes = adminNotes;

    const updatedOrder = await order.save();
    const populated = await Order.findById(updatedOrder._id).populate('user', 'name email');
    res.json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders (with filters and pagination)
// @route   GET /api/orders
// @access  Private/Admin
export const getOrders = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    if (req.query.paymentMethod && req.query.paymentMethod !== 'all') {
      filter.paymentMethod = req.query.paymentMethod;
    }

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate('user', 'id name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      orders,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    next(error);
  }
};
