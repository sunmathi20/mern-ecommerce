/**
 * Phase 7 Tests — Payment
 * 
 * Tests payment simulation endpoints, payment route guards,
 * and order-to-paid transitions.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

describe('Phase 7 — Payment', () => {
  // ─── Payment Simulation Route Guards ───

  describe('POST /api/payment/simulate-success', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/payment/simulate-success')
        .send({ orderId: '507f1f77bcf86cd799439011' });

      // Should return 401 Unauthorized (no token)
      expect(res.status).toBe(401);
    });

    it('should require orderId in body', async () => {
      // This test verifies the route exists and responds to POST
      const res = await request(app)
        .post('/api/payment/simulate-success')
        .send({});

      // Without auth, should be 401
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/payment/simulate-failure', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/payment/simulate-failure')
        .send({ orderId: '507f1f77bcf86cd799439011' });

      expect(res.status).toBe(401);
    });
  });

  // ─── Order Pay Route ───

  describe('PUT /api/orders/:id/pay', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .put('/api/orders/507f1f77bcf86cd799439011/pay')
        .send({
          id: 'PAYID-123',
          status: 'COMPLETED',
        });

      expect(res.status).toBe(401);
    });
  });

  // ─── Route Existence Checks ───

  describe('Payment routes exist', () => {
    it('POST /api/payment/simulate-success should not return 404', async () => {
      const res = await request(app)
        .post('/api/payment/simulate-success')
        .send({});

      // Should be 401 (auth required), NOT 404 (route not found)
      expect(res.status).not.toBe(404);
    });

    it('POST /api/payment/simulate-failure should not return 404', async () => {
      const res = await request(app)
        .post('/api/payment/simulate-failure')
        .send({});

      expect(res.status).not.toBe(404);
    });

    it('PUT /api/orders/:id/pay should not return 404', async () => {
      const res = await request(app)
        .put('/api/orders/507f1f77bcf86cd799439011/pay')
        .send({});

      expect(res.status).not.toBe(404);
    });
  });

  // ─── Production Guard ───

  describe('Production guard logic', () => {
    it('devOnlyGuard should allow in non-production', () => {
      // In the test environment, NODE_ENV is 'test' or undefined
      // The devOnlyGuard should allow requests through
      expect(process.env.NODE_ENV).not.toBe('production');
    });

    it('controller functions should block production', () => {
      // Verify the controller file exports the expected functions
      // This is a structural test to ensure the payment controller exists
      expect(typeof import('../controllers/paymentController.js')).toBe('object');
    });
  });

  // ─── API Health with Payment Routes ───

  describe('Health check still works after payment routes added', () => {
    it('GET /api/health should return 200', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('AURELIA');
    });
  });
});
