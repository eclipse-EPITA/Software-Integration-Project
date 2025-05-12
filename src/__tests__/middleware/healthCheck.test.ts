// src/__tests__/middleware/healthCheck.test.ts
import request from 'supertest';
import express from 'express';
import healthCheckRouter from '../../middleware/healthCheck';

describe('Health Check Endpoint', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(healthCheckRouter);
  });

  it('should return 200 status code', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
  });

  it('should return the correct JSON response', async () => {
    const response = await request(app).get('/api/health');
    expect(response.body).toEqual({
      message: 'All up and running !!'
    });
  });

  it('should have application/json content-type', async () => {
    const response = await request(app).get('/api/health');
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('should not respond to other HTTP methods', async () => {
    const methods = ['post', 'put', 'patch', 'delete'];
    
    for (const method of methods) {
      const response = await (request(app) as any)[method]('/api/health');
      expect(response.status).toBe(404);
    }
  });

  it('should not respond to incorrect routes', async () => {
    const response = await request(app).get('/api/wrong-route');
    expect(response.status).toBe(404);
  });
});