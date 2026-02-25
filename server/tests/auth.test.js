import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { logTestFailure } from './testHelper.js';

describe('Auth Module Integration Tests', () => {
    it('should fail to login with invalid credentials', async () => {
        try {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'wrongpassword'
                });

            expect(res.status).toBe(401);
            expect(res.body.error).toBeDefined();
        } catch (error) {
            logTestFailure('Login Invalid Credentials', error);
            throw error;
        }
    });

    // Note: Success login would require a real user in DB or mocking Supabase response
    // For now we focus on catching errors and ensuring they log.
});
