import express from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import {
    getClients,
    createClient,
    updateClient,
    deleteClient,
    saveDailyRecord,
    saveWeeklyRecord,
    getClientHistory,
    getClientById,
    ClientSchema
} from './clients.controller.js';
import { validateRequest } from '../../shared/middleware/validateRequest.js';


const router = express.Router();

// Apply authentication middleware to all client routes
router.use(authenticate);

/**
 * @openapi
 * /api/clients:
 *   get:
 *     summary: Get all clients for the authenticated user
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', getClients);
router.post('/', validateRequest(ClientSchema), createClient);
router.put('/:id', validateRequest(ClientSchema), updateClient);
router.delete('/:id', deleteClient);


router.post('/daily', saveDailyRecord);
router.post('/weekly', saveWeeklyRecord);
router.get('/:id/history', getClientHistory);
router.get('/:id', getClientById);

export default router;
