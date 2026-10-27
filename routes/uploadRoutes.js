import path from 'path';
import fs from 'fs';
import express from 'express';
import multer from 'multer';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext).replace(/[^\w-]/g, '');
    cb(null, `${cleanName}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

// File filter for safe luxury images
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpe?g|png|webp|svg/i;
  const allowedMimeTypes = /^image\/(jpe?g|png|webp|svg\+xml)$/i;

  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimeTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WEBP, and SVG image files are allowed.'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});

// @desc    Upload single image
// @route   POST /api/upload
// @access  Private/Admin
router.post('/', protect, admin, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size exceeds 5MB limit.' });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded.' });
    }

    const normalizedPath = `/${req.file.path.replace(/\\/g, '/')}`;
    res.status(201).json({
      message: 'Image uploaded successfully',
      image: normalizedPath,
      filename: req.file.filename,
      size: req.file.size,
    });
  });
});

// @desc    Upload multiple images
// @route   POST /api/upload/multiple
// @access  Private/Admin
router.post('/multiple', protect, admin, (req, res) => {
  upload.array('images', 6)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'One or more files exceed 5MB limit.' });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files uploaded.' });
    }

    const images = req.files.map((file) => `/${file.path.replace(/\\/g, '/')}`);
    res.status(201).json({
      message: `${req.files.length} image(s) uploaded successfully`,
      images,
    });
  });
});

export default router;
