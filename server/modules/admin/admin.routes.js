import express from 'express';
import { authenticate, checkRole } from '../auth/auth.middleware.js';
import { updateUserProfile, deleteUser, getLogs, getUsers } from './admin.controller.js';

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(checkRole(['admin']));

/**
 * @openapi
 * /api/admin/user/{id}:
 *   put:
 *     summary: Update user profile (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/users', getUsers);
router.put('/users/:id', updateUserProfile);
router.delete('/users/:id', deleteUser);
router.get('/logs', getLogs);

export default router;
