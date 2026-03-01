import express from 'express';
import { z } from 'zod';
import { authenticate, checkPlan } from '../auth/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.js';
import { generateNotes } from './ai.controller.js';
import { aiLimiter } from '../../shared/middleware/rateLimiter.js';

const router = express.Router();

const generateNotesSchema = z.object({
    body: z.object({
        assessment: z.string().min(1),
        numNotes: z.number().int().min(1).max(10),
        clientName: z.string().min(1),
        location: z.string().optional(),
        peoplePresent: z.string().optional(),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
});

/**
 * @openapi
 * /api/ai/generate-notes:
 *   post:
 *     summary: Generate clinical session notes using AI
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 */
router.post('/generate-notes', authenticate, checkPlan(['elite', 'advanced']), aiLimiter, validate(generateNotesSchema), generateNotes);

export default router;
