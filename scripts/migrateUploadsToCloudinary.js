/**
 * migrateUploadsToCloudinary.js
 * Reads all local product image paths from MongoDB,
 * uploads them to Cloudinary, then updates MongoDB with the new URLs.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import connectDB from '../config/db.js';
import Product from '../models/productModel.js';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = (filePath) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(filePath, {
      folder: 'aurelia-products',
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto',
    }, (err, result) => {
      if (err) reject(err);
      else resolve(result.secure_url);
    });
  });
};

const resolveLocalPath = (imgPath) => {
  // handles both "/uploads/file.jpg" and "uploads/file.jpg"
  const cleaned = imgPath.replace(/^\//, '');
  return path.resolve(cleaned);
};

const migrate = async () => {
  await connectDB();

  const products = await Product.find({});
  console.log(`Found ${products.length} products to process.\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    let changed = false;

    // Migrate main image
    if (product.image && product.image.startsWith('/uploads/')) {
      const localPath = resolveLocalPath(product.image);
      if (fs.existsSync(localPath)) {
        try {
          console.log(`Uploading: ${product.image}`);
          const url = await uploadToCloudinary(localPath);
          product.image = url;
          changed = true;
          console.log(`  -> ${url}`);
        } catch (e) {
          console.error(`  FAILED: ${e.message}`);
          failed++;
        }
      } else {
        console.warn(`  File not found locally, skipping: ${localPath}`);
        skipped++;
      }
    }

    // Migrate images array
    if (product.images && product.images.length > 0) {
      const newImages = [];
      for (const img of product.images) {
        if (img.startsWith('/uploads/')) {
          const localPath = resolveLocalPath(img);
          if (fs.existsSync(localPath)) {
            try {
              const url = await uploadToCloudinary(localPath);
              newImages.push(url);
              changed = true;
            } catch (e) {
              newImages.push(img); // keep old on failure
              failed++;
            }
          } else {
            newImages.push(img);
            skipped++;
          }
        } else {
          newImages.push(img); // already a URL, keep it
        }
      }
      product.images = newImages;
    }

    if (changed) {
      await product.save();
      updated++;
      console.log(`  Saved product: ${product.name}\n`);
    }
  }

  console.log('=============================');
  console.log(`Migration complete!`);
  console.log(`  Updated : ${updated}`);
  console.log(`  Skipped : ${skipped}`);
  console.log(`  Failed  : ${failed}`);
  console.log('=============================');
  await mongoose.disconnect();
  process.exit(0);
};

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
