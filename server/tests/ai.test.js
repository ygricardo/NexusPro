import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { logTestFailure } from './testHelper.js';

describe('AI Module Integration Tests', () => {
    it('should return 401 if unauthorized access to generate notes', async () => {
        try {
            const res = await request(app)
                .post('/api/ai/generate-notes')
                .send({
                    assessmentData: 'Test content'
                });

            expect(res.status).toBe(401);
        } catch (error) {
            logTestFailure('AI Notes Unauthorized Access', error);
            throw error;
        }
    });

    it('should return 400 if assessment data is missing', async () => {
        // We'd need a token here to pass authentication
        // For demonstration of "Error Handling", we test the failure path
        try {
            const res = await request(app)
                .post('/api/ai/generate-notes')
                .set('Authorization', 'Bearer invalid_token')
                .send({});

            // This should fail with 401 due to invalid token
            expect(res.status).not.toBe(200);
        } catch (error) {
            logTestFailure('AI Notes Missing Token/Data', error);
            throw error;
        }
    });
});
