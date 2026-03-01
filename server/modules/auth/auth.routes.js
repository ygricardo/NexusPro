import express from 'express';
import { login, register, getProfile, syncSession } from './auth.controller.js';
import { authenticate, authenticateSupabase } from './auth.middleware.js';
import { authLimiter } from '../../shared/middleware/rateLimiter.js';

const router = express.Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     responses:
 *       201:
 *         description: User created
 */
router.post('/register', authLimiter, register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', authLimiter, login);

/**
 * @openapi
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.get('/profile', authenticate, getProfile);

/**
 * @openapi
 * /api/auth/sync:
 *   post:
 *     summary: Sync Supabase OAuth session and retrieve Nexus JWT
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: [] 
 */
router.post('/sync', authenticateSupabase, syncSession);

export default router;
