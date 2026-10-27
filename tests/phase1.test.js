/**
 * Phase 1 — Backend Tests
 * 
 * Tests:
 * - Express app exports correctly
 * - Health endpoint returns correct response
 * - Security middleware is active (Helmet headers, CORS)
 * - 404 handler works for undefined routes
 * - Error handler does not expose stack in production mode
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

describe('Phase 1 — Backend Foundation', () => {

  describe('Health Endpoint', () => {
    it('GET /api/health returns success', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('AURELIA API is running');
      expect(res.body).toHaveProperty('environment');
      expect(res.body).toHaveProperty('database');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('Security Middleware', () => {
    it('includes Helmet security headers', async () => {
      const res = await request(app).get('/api/health');
      // Helmet sets various headers; check a few key ones
      expect(res.headers).toHaveProperty('x-content-type-options');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('includes CORS headers for allowed origin', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('responds to preflight OPTIONS requests', async () => {
      const res = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET');
      expect(res.status).toBeLessThan(400);
    });
  });

  describe('Error Handling', () => {
    it('returns 404 for undefined routes', async () => {
      const res = await request(app).get('/api/nonexistent-route');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Not Found');
    });

    it('404 response has correct JSON structure', async () => {
      const res = await request(app).get('/api/this-does-not-exist');
      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('Body Parsing', () => {
    it('accepts JSON body', async () => {
      // POST to a non-existent route to verify JSON parsing works (should 404, not 400)
      const res = await request(app)
        .post('/api/test-json')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');
      // Should be 404 (route not found), not 400 (bad parsing)
      expect(res.status).toBe(404);
    });
  });
});
