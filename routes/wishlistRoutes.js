import express from 'express';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  mergeWishlist,
} from '../controllers/wishlistController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All wishlist routes are protected
router.use(protect);

router.route('/')
  .get(getWishlist)
  .delete(clearWishlist);

router.route('/merge')
  .post(mergeWishlist);

router.route('/:productId')
  .post(addToWishlist)
  .delete(removeFromWishlist);

export default router;
