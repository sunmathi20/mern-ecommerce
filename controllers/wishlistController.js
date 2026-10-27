import mongoose from 'mongoose';
import Wishlist from '../models/wishlistModel.js';
import Product from '../models/productModel.js';

// Helper to sanitize and populate wishlist
const populateWishlist = async (wishlist) => {
  await wishlist.populate({
    path: 'items.product',
    select: 'name image images category price originalPrice countInStock rating numReviews brand material sizes colors description slug isActive',
  });

  // Filter out any items where product may have been deleted
  const validItems = wishlist.items.filter((item) => item.product && item.product._id);
  if (validItems.length !== wishlist.items.length) {
    wishlist.items = validItems;
    await wishlist.save();
  }
  return wishlist;
};

// @desc    Get logged-in user's wishlist
// @route   GET /api/wishlist
// @access  Private
export const getWishlist = async (req, res, next) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, items: [] });
    } else {
      await populateWishlist(wishlist);
    }

    res.json({
      success: true,
      count: wishlist.items.length,
      items: wishlist.items,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add product to wishlist
// @route   POST /api/wishlist/:productId
// @access  Private
export const addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400);
      return next(new Error('Invalid product ID format'));
    }

    // Verify product exists in catalog
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }

    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = new Wishlist({
        user: req.user._id,
        items: [{ product: productId, addedAt: new Date() }],
      });
      await wishlist.save();
    } else {
      // Prevent duplicates
      const alreadyExists = wishlist.items.some(
        (item) => item.product.toString() === productId.toString()
      );

      if (!alreadyExists) {
        wishlist.items.unshift({ product: productId, addedAt: new Date() });
        await wishlist.save();
      }
    }

    await populateWishlist(wishlist);

    res.status(200).json({
      success: true,
      message: 'Product added to wishlist',
      count: wishlist.items.length,
      items: wishlist.items,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private
export const removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400);
      return next(new Error('Invalid product ID format'));
    }

    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      return res.json({
        success: true,
        message: 'Wishlist is empty',
        count: 0,
        items: [],
      });
    }

    wishlist.items = wishlist.items.filter(
      (item) => item.product.toString() !== productId.toString()
    );

    await wishlist.save();
    await populateWishlist(wishlist);

    res.json({
      success: true,
      message: 'Product removed from wishlist',
      count: wishlist.items.length,
      items: wishlist.items,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear all items from wishlist
// @route   DELETE /api/wishlist
// @access  Private
export const clearWishlist = async (req, res, next) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (wishlist) {
      wishlist.items = [];
      await wishlist.save();
    }

    res.json({
      success: true,
      message: 'Wishlist cleared successfully',
      count: 0,
      items: [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Merge guest wishlist items with authenticated user wishlist
// @route   POST /api/wishlist/merge
// @access  Private
export const mergeWishlist = async (req, res, next) => {
  try {
    const { productIds } = req.body;

    if (!Array.isArray(productIds)) {
      res.status(400);
      return next(new Error('productIds must be an array'));
    }

    // Filter valid IDs
    const validIds = productIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

    // Check which exist in database
    const existingProducts = await Product.find({ _id: { $in: validIds } }).select('_id');
    const existingIds = new Set(existingProducts.map((p) => p._id.toString()));

    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user._id, items: [] });
    }

    const currentIds = new Set(wishlist.items.map((i) => i.product.toString()));

    for (const pid of validIds) {
      const pidStr = pid.toString();
      if (existingIds.has(pidStr) && !currentIds.has(pidStr)) {
        wishlist.items.unshift({ product: pid, addedAt: new Date() });
        currentIds.add(pidStr);
      }
    }

    await wishlist.save();
    await populateWishlist(wishlist);

    res.json({
      success: true,
      message: 'Wishlist merged successfully',
      count: wishlist.items.length,
      items: wishlist.items,
    });
  } catch (error) {
    next(error);
  }
};
