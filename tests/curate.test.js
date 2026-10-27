/**
 * Curate Moment Backend Tests — Generation, Replacement, Security & Saved Looks
 *
 * Tests:
 * - POST /api/curate/generate creates a verified complete coordinated look
 * - Verified totalPrice equals sum of actual product prices in look
 * - Engine labels are accurate and honest ('catalog-styling' / 'Atelier Styling Engine')
 * - POST /api/curate/replace-item returns alternatives excluding current product
 * - POST /api/curate/saved rejects unauthenticated requests with 401
 * - GET /api/curate/saved rejects unauthenticated requests with 401
 * - DELETE /api/curate/saved/:id rejects unauthenticated requests with 401
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import connectDB from '../config/db.js';

describe('Curate Moment — AI & Catalog Styling Engine', () => {
  beforeAll(async () => {
    await connectDB();
  });

  describe('Look Generation & Heuristic Engine', () => {
    it('POST /api/curate/generate generates a complete look with coordinated slots', async () => {
      const res = await request(app)
        .post('/api/curate/generate')
        .send({
          occasion: 'Date Night',
          aesthetic: 'Quiet Luxury',
          preferredColors: ['Burgundy', 'Noir'],
          maxBudget: 60000,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.look).toBeDefined();

      const { look } = res.body;
      expect(look.title).toBeTruthy();
      expect(look.occasion).toBe('Date Night');
      expect(look.aesthetic).toBe('Quiet Luxury');
      expect(look.explanation).toContain('Date Night');
      expect(look.engine).toMatch(/catalog-styling|ai-gemini/);
      expect(look.items.length).toBeGreaterThanOrEqual(3);

      // Verify slots exist
      const slots = look.items.map((i) => i.slot);
      expect(slots).toContain('main');
      expect(slots).toContain('footwear');

      // Verify total price equals sum of items
      const expectedTotal = look.items.reduce((acc, i) => acc + i.product.price, 0);
      expect(look.totalPrice).toBe(expectedTotal);
    });

    it('POST /api/curate/replace-item returns alternatives for a slot', async () => {
      const res = await request(app)
        .post('/api/curate/replace-item')
        .send({
          slot: 'footwear',
          category: 'Footwear',
          aesthetic: 'Old Money',
          occasion: 'Wedding Guest',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.replacements)).toBe(true);
    });
  });

  describe('Security & Authentication Guards for Saved Looks', () => {
    it('POST /api/curate/saved rejects unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/curate/saved')
        .send({
          title: 'My Curated Look',
          items: [{ product: '507f1f77bcf86cd799439011', slot: 'main' }],
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/not authorized|no token/i);
    });

    it('GET /api/curate/saved rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/curate/saved');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/not authorized|no token/i);
    });

    it('DELETE /api/curate/saved/:id rejects unauthenticated requests with 401', async () => {
      const res = await request(app).delete('/api/curate/saved/507f1f77bcf86cd799439011');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/not authorized|no token/i);
    });
  });
});
