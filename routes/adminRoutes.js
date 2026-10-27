import express from 'express';
import {
  getDashboardStats,
  getCustomers,
  getCustomerById,
  getStoreSettings,
  updateStoreSettings,
} from '../controllers/adminController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// All admin routes require authentication + admin role
router.use(protect, admin);

router.get('/dashboard', getDashboardStats);
router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomerById);
router.get('/users', getCustomers);
router.get('/users/:id', getCustomerById);

router.route('/settings')
  .get(getStoreSettings)
  .put(updateStoreSettings);

export default router;
