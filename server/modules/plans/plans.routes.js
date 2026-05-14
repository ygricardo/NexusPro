import express from 'express';
import { authenticate, checkRole } from '../auth/auth.middleware.js';
import {
    listActivePlans,
    listAllPlans,
    createPlan,
    updatePlan,
    togglePlan,
    deletePlan,
} from './plans.controller.js';

const router = express.Router();

// Public — pricing page reads active plans without auth
router.get('/', listActivePlans);

// Admin — full CRUD
const adminRouter = express.Router();
adminRouter.use(authenticate);
adminRouter.use(checkRole(['admin']));

adminRouter.get('/', listAllPlans);
adminRouter.post('/', createPlan);
adminRouter.put('/:id', updatePlan);
adminRouter.patch('/:id/toggle', togglePlan);
adminRouter.delete('/:id', deletePlan);

export { router as plansRouter, adminRouter as plansAdminRouter };
