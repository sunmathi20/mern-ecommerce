import express from 'express';
import {
  addOrderItems,
  getOrderById,
  getMyOrders,
  cancelOrder,
  updateOrderStatus,
  getOrders,
} from '../controllers/orderController.js';
import { updateOrderToPaid } from '../controllers/paymentController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, addOrderItems)
  .get(protect, admin, getOrders);

router.get('/myorders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/pay', protect, updateOrderToPaid);
router.put('/:id/cancel', protect, cancelOrder);
router.put('/:id/status', protect, admin, updateOrderStatus);

export default router;
