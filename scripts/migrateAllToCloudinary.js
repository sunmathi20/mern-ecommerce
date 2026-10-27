/**
 * migrateAllToCloudinary.js
 * Handles /assets/ (from frontend/public) and /uploads/ (backend disk) paths.
 * Uploads each file to Cloudinary and updates MongoDB.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import connectDB from '../config/db.js';
import Product from '../models/productModel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FRONTEND_PUBLIC = path.resolve(__dirname, '../../frontend/public');
const BACKEND_ROOT = path.resolve(__dirname, '..');

const resolveFilePath = (imgPath) => {
  if (imgPath.startsWith('/assets/')) {
    return path.join(FRONTEND_PUBLIC, imgPath);
  }
  if (imgPath.startsWith('/uploads/')) {
    return path.join(BACKEND_ROOT, imgPath);
  }
  return null;
};

const uploadToCloudinary = (filePath) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(filePath, {
      folder: 'aurelia-products',
      resource_type: 'image',
      quality: 'auto',
    }, (err, result) => {
      if (err) reject(err);
      else resolve(result.secure_url);
    });
  });
};

const migrateImagePath = async (imgPath) => {
  if (!imgPath || imgPath.startsWith('http')) return imgPath; // already CDN
  const localPath = resolveFilePath(imgPath);
  if (!localPath) return imgPath;
  if (!fs.existsSync(localPath)) {
    console.warn(`  [MISSING] ${imgPath}`);
    return imgPath;
  }
  console.log(`  [UPLOADING] ${imgPath}`);
  const url = await uploadToCloudinary(localPath);
  console.log(`  [DONE] -> ${url}`);
  return url;
};

const migrate = async () => {
  await connectDB();

  const products = await Product.find({});
  console.log(`\nFound ${products.length} products.\n`);

  let updated = 0;

  for (const product of products) {
    let changed = false;

    const newImage = await migrateImagePath(product.image);
    if (newImage !== product.image) {
      product.image = newImage;
      changed = true;
    }

    if (product.images && product.images.length > 0) {
      const newImages = [];
      for (const img of product.images) {
        const newImg = await migrateImagePath(img);
        newImages.push(newImg);
        if (newImg !== img) changed = true;
      }
      product.images = newImages;
    }

    if (changed) {
      await product.save();
      updated++;
      console.log(`  Saved: ${product.name}\n`);
    }
  }

  console.log('==============================');
  console.log(`Migration complete! Updated: ${updated}`);
  console.log('==============================');
  await mongoose.disconnect();
  process.exit(0);
};

migrate().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
