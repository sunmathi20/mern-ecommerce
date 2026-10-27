/**
 * uploadRoutes.js — Cloudinary-backed image upload.
 * Uses multer memoryStorage + Cloudinary upload stream.
 * Local disk is never written to; Cloudinary returns a secure URL.
 */
import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { protect, admin } from '../middleware/authMiddleware.js';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const router = express.Router();

// Keep file in memory — no disk write
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /^image\/(jpe?g|png|webp|svg\+xml)$/i;
  if (allowed.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WEBP, and SVG images are allowed.'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter,
});

/** Helper: upload buffer to Cloudinary via upload_stream */
const uploadToCloudinary = (buffer, mimetype) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'aurelia-products',
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto',
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

// @desc    Upload single image
// @route   POST /api/upload
// @access  Private/Admin
router.post('/', protect, admin, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded.' });
    }

    try {
      const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
      res.status(201).json({
        message: 'Image uploaded successfully',
        image: result.secure_url,
        publicId: result.public_id,
        size: req.file.size,
      });
    } catch (cloudErr) {
      console.error('Cloudinary upload error:', cloudErr);
      res.status(500).json({ message: 'Failed to upload image to Cloudinary.' });
    }
  });
});

// @desc    Upload multiple images
// @route   POST /api/upload/multiple
// @access  Private/Admin
router.post('/multiple', protect, admin, (req, res) => {
  upload.array('images', 6)(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files uploaded.' });
    }

    try {
      const uploads = await Promise.all(
        req.files.map((f) => uploadToCloudinary(f.buffer, f.mimetype))
      );
      const images = uploads.map((r) => r.secure_url);
      res.status(201).json({
        message: `${images.length} image(s) uploaded successfully`,
        images,
      });
    } catch (cloudErr) {
      console.error('Cloudinary upload error:', cloudErr);
      res.status(500).json({ message: 'Failed to upload images to Cloudinary.' });
    }
  });
});

export default router;
