/**
 * Create Admin Account — Safe script to create the first admin user.
 *
 * Usage:
 *   node seed/createAdmin.js
 *
 * Environment variables (from .env):
 *   ADMIN_NAME    — defaults to 'Admin'
 *   ADMIN_EMAIL   — defaults to 'admin@aurelia.com'
 *   ADMIN_PASSWORD — defaults to 'admin123' (CHANGE IN PRODUCTION)
 *
 * If the admin email already exists, it updates the role to 'admin'.
 * Does NOT delete any existing data.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/userModel.js';
import connectDB from '../config/db.js';

dotenv.config();

const createAdmin = async () => {
  try {
    await connectDB();

    const name = process.env.ADMIN_NAME || 'Admin';
    const email = process.env.ADMIN_EMAIL || 'admin@aurelia.com';
    const password = process.env.ADMIN_PASSWORD || 'password123';

    const forceReset = process.argv.includes('--force') || process.env.ADMIN_RESET === 'true';
    const existing = await User.findOne({ email });

    if (existing) {
      if (existing.role === 'admin' && !forceReset) {
        console.log(`\nℹ Administrator account already exists: ${email}`);
        console.log(`  Role: ${existing.role}`);
        console.log(`  Account is already configured. Credentials were NOT overwritten.`);
        console.log(`  To explicitly reset the password, run: node seed/createAdmin.js --force\n`);
        process.exit(0);
      }

      // If user exists as a customer, promote to admin; or if --force is used, update password
      existing.role = 'admin';
      if (forceReset || existing.role !== 'admin') {
        existing.password = password;
      }
      await existing.save();
      console.log(`\n✓ Admin account updated: ${email}`);
      console.log(`  Role confirmed as 'admin'.${forceReset ? ' Password re-hashed.' : ''}\n`);
    } else {
      await User.create({
        name,
        email,
        password,
        role: 'admin',
      });
      console.log(`\n✓ Admin account created successfully!`);
      console.log(`  Email:    ${email}`);
      console.log(`  Password: ${password}`);
      console.log(`  ⚠ Change this password immediately in production!\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error(`\n✗ Error creating admin: ${error.message}\n`);
    process.exit(1);
  }
};

createAdmin();
