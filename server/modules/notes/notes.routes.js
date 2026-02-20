import express from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import { saveNote, getNotesByUser, getNotesByClient, deleteNote } from './notes.controller.js';
import { createPreset, getPresets, deletePreset } from './presets.controller.js';
import { saveEntry, getHistory, deleteEntry } from './history.controller.js';

const router = express.Router();

// All notes module routes require authentication
router.use(authenticate);

// === Notes sub-routes ===

/**
 * @openapi
 * /api/notes:
 *   post:
 *     summary: Save a generated note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 */
router.post('/notes', saveNote);
router.get('/notes', getNotesByUser);
router.get('/notes/client/:clientId', getNotesByClient);
router.delete('/notes/:id', deleteNote);

// === Presets sub-routes ===

/**
 * @openapi
 * /api/presets:
 *   get:
 *     summary: Get user presets
 *     tags: [Presets]
 *     security:
 *       - bearerAuth: []
 */
router.get('/presets', getPresets);
router.post('/presets', createPreset);
router.delete('/presets/:id', deletePreset);

// === History sub-routes ===

/**
 * @openapi
 * /api/history:
 *   post:
 *     summary: Save a generation history entry
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 */
router.post('/history', saveEntry);
router.get('/history/:type', getHistory);
router.delete('/history/:id', deleteEntry);

export default router;
