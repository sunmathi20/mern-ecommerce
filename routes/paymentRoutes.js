import express from 'express';
import {
  simulatePaymentSuccess,
  simulatePaymentFailure,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// =========================================
// PAYMENT SIMULATION ROUTES (DEV ONLY)
// =========================================
// These routes simulate payment processing
// for development and testing purposes.
// They are blocked in production by the
// controller logic AND by the middleware
// guard below.
// =========================================

const devOnlyGuard = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'Payment simulation endpoints are disabled in production.',
    });
  }
  next();
};

router.post('/simulate-success', devOnlyGuard, protect, simulatePaymentSuccess);
router.post('/simulate-failure', devOnlyGuard, protect, simulatePaymentFailure);

export default router;
