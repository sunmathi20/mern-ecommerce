import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import User from '../models/userModel.js';
import Settings from '../models/settingsModel.js';

// @desc    Get admin dashboard statistics (real MongoDB data)
// @route   GET /api/admin/dashboard
// @access  Private/Admin
export const getDashboardStats = async (req, res, next) => {
  try {
    // ── Product Stats ──
    const totalProducts = await Product.countDocuments();
    const outOfStockProducts = await Product.countDocuments({ countInStock: 0 });
    const activeProducts = totalProducts - outOfStockProducts;
    const lowStockProducts = await Product.find({
      countInStock: { $gt: 0, $lte: 5 },
    })
      .select('name category countInStock price image')
      .sort({ countInStock: 1 })
      .limit(10)
      .lean();

    // ── Order Stats ──
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({
      status: { $in: ['PENDING_PAYMENT', 'CONFIRMED'] },
    });
    const processingOrders = await Order.countDocuments({ status: 'PROCESSING' });
    const deliveredOrders = await Order.countDocuments({ status: 'DELIVERED' });
    const cancelledOrders = await Order.countDocuments({ status: 'CANCELLED' });

    // ── Revenue: only PAID + DELIVERED + COD CONFIRMED orders ──
    const revenueResult = await Order.aggregate([
      {
        $match: {
          status: { $in: ['PAID', 'DELIVERED', 'CONFIRMED'] },
          $or: [{ isPaid: true }, { paymentMethod: 'COD' }],
        },
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // ── Customer Stats ──
    const totalCustomers = await User.countDocuments({ role: 'user' });

    // ── Recent Orders (last 10) ──
    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderItems totalPrice status paymentMethod isPaid createdAt user')
      .lean();

    // ── Recent Products (last 5) ──
    const recentProducts = await Product.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name category price countInStock image createdAt')
      .lean();

    // ── Categories breakdown ──
    const categoryCounts = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      products: {
        total: totalProducts,
        active: activeProducts,
        outOfStock: outOfStockProducts,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        processing: processingOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
      },
      revenue: totalRevenue,
      customers: totalCustomers,
      lowStockProducts,
      recentOrders,
      recentProducts,
      categoryCounts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all customers (admin)
// @route   GET /api/admin/customers
// @access  Private/Admin
export const getCustomers = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const keyword = req.query.keyword
      ? {
          $or: [
            { name: { $regex: req.query.keyword, $options: 'i' } },
            { email: { $regex: req.query.keyword, $options: 'i' } },
          ],
        }
      : {};

    const filter = { role: 'user', ...keyword };
    const total = await User.countDocuments(filter);
    const customers = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Attach order count and total spend per customer
    const customerIds = customers.map((c) => c._id);
    const orderStats = await Order.aggregate([
      { $match: { user: { $in: customerIds } } },
      {
        $group: {
          _id: '$user',
          orderCount: { $sum: 1 },
          totalSpend: {
            $sum: {
              $cond: [
                { $in: ['$status', ['PAID', 'DELIVERED', 'CONFIRMED']] },
                '$totalPrice',
                0,
              ],
            },
          },
        },
      },
    ]);

    const statsMap = {};
    orderStats.forEach((s) => {
      statsMap[s._id.toString()] = {
        orderCount: s.orderCount,
        totalSpend: s.totalSpend,
      };
    });

    const enriched = customers.map((c) => ({
      ...c,
      orderCount: statsMap[c._id.toString()]?.orderCount || 0,
      totalSpend: statsMap[c._id.toString()]?.totalSpend || 0,
    }));

    res.json({
      customers: enriched,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer details and order history
// @route   GET /api/admin/customers/:id
// @access  Private/Admin
export const getCustomerById = async (req, res, next) => {
  try {
    const customer = await User.findById(req.params.id).select('-password').lean();
    if (!customer) {
      res.status(404);
      throw new Error('Customer not found');
    }

    const orders = await Order.find({ user: customer._id }).sort({ createdAt: -1 }).lean();

    res.json({
      customer,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get store configuration settings
// @route   GET /api/admin/settings
// @access  Private/Admin
export const getStoreSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

// @desc    Update store configuration settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
export const updateStoreSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    const updated = await settings.save();
    res.json(updated);
  } catch (error) {
    next(error);
  }
};
