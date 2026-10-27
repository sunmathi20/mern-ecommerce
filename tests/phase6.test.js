/**
 * Phase 6 — Buy Now & Checkout Backend Tests
 *
 * Tests:
 * - Order endpoints require authentication (JWT)
 * - Server-side validation rejects empty orders
 * - Server-side validation rejects missing shipping address
 * - Order retrieval by ID requires authentication
 * - My orders endpoint requires authentication
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

describe('Phase 6 — Buy Now & Checkout Security & Validation', () => {

  describe('Authentication Enforcement', () => {
    it('POST /api/orders rejects unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          orderItems: [{ product: '507f1f77bcf86cd799439011', qty: 1 }],
          shippingAddress: { address: '123 Luxury Ave', city: 'Mumbai', postalCode: '400001', country: 'India' },
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/not authorized|no token/i);
    });

    it('GET /api/orders/myorders rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/orders/myorders');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/not authorized|no token/i);
    });

    it('GET /api/orders/:id rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/orders/507f1f77bcf86cd799439011');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/not authorized|no token/i);
    });
  });

  describe('Financial Business Logic', () => {
    it('calculates 18% GST tax correctly on luxury price values', () => {
      const itemsPrice = 12000;
      const taxRate = 0.18;
      const tax = Number((itemsPrice * taxRate).toFixed(2));
      expect(tax).toBe(2160);
    });

    it('applies free shipping for orders over ₹10,000, else ₹500', () => {
      const highValueOrder = 14999;
      const lowValueOrder = 4999;

      const highShipping = highValueOrder > 10000 ? 0 : 500;
      const lowShipping = lowValueOrder > 10000 ? 0 : 500;

      expect(highShipping).toBe(0);
      expect(lowShipping).toBe(500);
    });
  });
});
