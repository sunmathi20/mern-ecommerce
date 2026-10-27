import express from 'express';
import {
  generateLook,
  getReplacements,
  saveLook,
  getSavedLooks,
  deleteSavedLook,
} from '../controllers/curateController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public look generation and replacement
router.post('/generate', generateLook);
router.post('/replace-item', getReplacements);

// Protected saved look routes
router.route('/saved')
  .post(protect, saveLook)
  .get(protect, getSavedLooks);

router.delete('/saved/:id', protect, deleteSavedLook);

export default router;
