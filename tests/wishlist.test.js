/**
 * Wishlist Backend Tests — Security, RBAC & Endpoints
 *
 * Tests:
 * - GET /api/wishlist rejects unauthenticated requests with 401
 * - POST /api/wishlist/:productId rejects unauthenticated requests with 401
 * - DELETE /api/wishlist/:productId rejects unauthenticated requests with 401
 * - DELETE /api/wishlist (clear) rejects unauthenticated requests with 401
 * - POST /api/wishlist/merge rejects unauthenticated requests with 401
 * - Endpoints exist and do not return 404 (Not Found)
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

describe('Wishlist Backend Security & Endpoints', () => {
  describe('Authentication Enforcement', () => {
    it('GET /api/wishlist rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/wishlist');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/not authorized|no token/i);
    });

    it('POST /api/wishlist/:productId rejects unauthenticated requests with 401', async () => {
      const res = await request(app).post('/api/wishlist/507f1f77bcf86cd799439011');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/not authorized|no token/i);
    });

    it('DELETE /api/wishlist/:productId rejects unauthenticated requests with 401', async () => {
      const res = await request(app).delete('/api/wishlist/507f1f77bcf86cd799439011');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/not authorized|no token/i);
    });

    it('DELETE /api/wishlist rejects unauthenticated requests with 401', async () => {
      const res = await request(app).delete('/api/wishlist');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/not authorized|no token/i);
    });

    it('POST /api/wishlist/merge rejects unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/wishlist/merge')
        .send({ productIds: ['507f1f77bcf86cd799439011'] });
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/not authorized|no token/i);
    });
  });

  describe('Route Existence Checks', () => {
    it('routes exist and do not return 404 for wishlist endpoints', async () => {
      const getRes = await request(app).get('/api/wishlist');
      expect(getRes.status).not.toBe(404);

      const postRes = await request(app).post('/api/wishlist/507f1f77bcf86cd799439011');
      expect(postRes.status).not.toBe(404);

      const deleteRes = await request(app).delete('/api/wishlist/507f1f77bcf86cd799439011');
      expect(deleteRes.status).not.toBe(404);

      const clearRes = await request(app).delete('/api/wishlist');
      expect(clearRes.status).not.toBe(404);

      const mergeRes = await request(app).post('/api/wishlist/merge');
      expect(mergeRes.status).not.toBe(404);
    });
  });
});
