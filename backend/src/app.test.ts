import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

describe('application', () => {
  it('reports service health', async () => {
    const response = await request(createApp()).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('rejects an unknown browser origin', async () => {
    const response = await request(createApp()).get('/health').set('Origin', 'https://example.org');
    expect(response.status).toBe(400);
  });
});
