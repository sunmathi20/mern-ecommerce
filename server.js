/**
 * AURELIA Backend Server
 * 
 * Express server with security middleware (Helmet, CORS, Rate Limiting),
 * MongoDB connection, and health check endpoint.
 */
// AURELIA v2 Backend Server

import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import curateRoutes from './routes/curateRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---------------------
// Security Middleware
// ---------------------

// Helmet — sets various HTTP headers for security
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS — configured to allow frontend origin with credentials (cookies)
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow any localhost / 127.0.0.1 port in development, or explicit allowed origins
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (isLocalhost || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate Limiting — prevent brute-force attacks
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ---------------------
// Body Parsing
// ---------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---------------------
// Health Check
// ---------------------
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.json({
    success: true,
    message: 'AURELIA API is running',
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus[dbState] || 'unknown',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------
// Static Files
// ---------------------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------------------
// Routes
// ---------------------
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/curate', curateRoutes);

// ---------------------
// Error Handling
// ---------------------
app.use(notFound);
app.use(errorHandler);

// ---------------------
// Start Server
// ---------------------
const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`\n✓ AURELIA server running on port ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Health: http://localhost:${PORT}/api/health\n`);
  });

  return server;
};

// Only start the server if this file is run directly (not imported for testing)
if (process.argv[1] && (
  process.argv[1].endsWith('server.js') ||
  process.argv[1].includes('server')
)) {
  startServer();
}

// Export for testing
export { app, startServer };
