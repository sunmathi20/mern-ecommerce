/**
 * Admin Panel & Management Tests — Route guards & Role-Based Access Control (RBAC)
 *
 * Tests:
 * - GET /api/admin/dashboard rejects unauthenticated requests with 401
 * - GET /api/admin/customers rejects unauthenticated requests with 401
 * - Product mutation endpoints (POST, PUT, DELETE, PATCH) require admin authentication
 * - Category mutation endpoints (POST, PUT, DELETE) require admin authentication
 * - Category listing (GET /api/categories) is public and returns categories
 * - Upload endpoints require admin authentication
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

describe('Admin Panel Foundation & Security', () => {
  describe('Authentication and RBAC Guards', () => {
    it('GET /api/admin/dashboard rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/admin/dashboard');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/not authorized|no token/i);
    });

    it('GET /api/admin/customers rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/admin/customers');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/not authorized|no token/i);
    });

    it('routes exist and do not return 404 for admin endpoints', async () => {
      const dashRes = await request(app).get('/api/admin/dashboard');
      expect(dashRes.status).not.toBe(404);

      const custRes = await request(app).get('/api/admin/customers');
      expect(custRes.status).not.toBe(404);
    });
  });

  describe('Product Management RBAC Guards', () => {
    it('POST /api/products rejects unauthenticated requests with 401', async () => {
      const res = await request(app).post('/api/products').send({
        name: 'Luxury Velvet Coat',
        price: 24000,
        category: 'Jackets',
      });
      expect(res.status).toBe(401);
    });

    it('PUT /api/products/:id rejects unauthenticated requests with 401', async () => {
      const res = await request(app).put('/api/products/507f1f77bcf86cd799439011').send({
        price: 26000,
      });
      expect(res.status).toBe(401);
    });

    it('DELETE /api/products/:id rejects unauthenticated requests with 401', async () => {
      const res = await request(app).delete('/api/products/507f1f77bcf86cd799439011');
      expect(res.status).toBe(401);
    });

    it('PATCH /api/products/:id/status rejects unauthenticated requests with 401', async () => {
      const res = await request(app).patch('/api/products/507f1f77bcf86cd799439011/status').send({
        isActive: false,
      });
      expect(res.status).toBe(401);
    });
  });

  describe('Category Management RBAC & Public Endpoints', () => {
    it('GET /api/categories is publicly accessible and does not return 404', async () => {
      const res = await request(app).get('/api/categories');
      expect(res.status).not.toBe(404);
    });

    it('POST /api/categories rejects unauthenticated requests with 401', async () => {
      const res = await request(app).post('/api/categories').send({
        name: 'Fine Jewellery',
        slug: 'fine-jewellery',
      });
      expect(res.status).toBe(401);
    });

    it('PUT /api/categories/:id rejects unauthenticated requests with 401', async () => {
      const res = await request(app).put('/api/categories/507f1f77bcf86cd799439011').send({
        description: 'Updated description',
      });
      expect(res.status).toBe(401);
    });

    it('DELETE /api/categories/:id rejects unauthenticated requests with 401', async () => {
      const res = await request(app).delete('/api/categories/507f1f77bcf86cd799439011');
      expect(res.status).toBe(401);
    });
  });

  describe('Image Upload RBAC Guards', () => {
    it('POST /api/upload rejects unauthenticated requests with 401', async () => {
      const res = await request(app).post('/api/upload');
      expect(res.status).toBe(401);
    });

    it('POST /api/upload/multiple rejects unauthenticated requests with 401', async () => {
      const res = await request(app).post('/api/upload/multiple');
      expect(res.status).toBe(401);
    });
  });
});
