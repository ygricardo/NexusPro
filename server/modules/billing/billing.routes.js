import express from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import {
    createCheckoutSession,
    handleWebhook,
    cancelSubscription,
    verifySession,
    getSubscriptionDetails,
    resumeSubscription,
    createPortalSession,
    updateSubscription
} from './billing.controller.js';

const router = express.Router();

/**
 * @openapi
 * /api/stripe/webhook:
 *   post:
 *     summary: Handle Stripe webhooks
 *     tags: [Billing]
 */
router.post('/webhook', handleWebhook);

// All routes below require authentication
router.use(authenticate);

/**
 * @openapi
 * /api/stripe/create-checkout-session:
 *   post:
 *     summary: Create a Stripe checkout session
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 */
router.post('/create-checkout-session', createCheckoutSession);

router.post('/verify-session', verifySession);
router.get('/subscription', getSubscriptionDetails);
router.post('/cancel-subscription', cancelSubscription);
router.post('/resume-subscription', resumeSubscription);
router.post('/create-portal-session', createPortalSession);
router.post('/update-subscription', updateSubscription);

export default router;
