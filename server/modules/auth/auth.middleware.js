import jwt from 'jsonwebtoken';
import { config } from '../../shared/config/index.js';
import logger from '../../shared/lib/logger.js';

const JWT_SECRET = config.jwtSecret;


export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Map 'sub' to 'id' for consistency with downstream controllers
        req.user = {
            ...decoded,
            id: decoded.sub || decoded.id
        };
        next();
    } catch (error) {
        logger.warn('[Auth] Token verification failed', {
            error: error.message,
            ip: req.ip,
            url: req.originalUrl
        });
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

/**
 * Validates a Supabase Access Token directly instead of our custom JWT.
 * Used exclusively for the /sync endpoint after a Google OAuth flow.
 */
export const authenticateSupabase = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No Supabase token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Dynamically import supabaseAdmin to avoid circular dependencies
        const { supabaseAdmin } = await import('../../shared/lib/supabase.js');

        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            logger.warn('[Auth] authenticateSupabase verification failed', { error: error?.message });
            return res.status(401).json({ error: 'Invalid or expired Supabase token' });
        }

        req.user = user;
        next();
    } catch (error) {
        logger.error('[Auth] authenticateSupabase unexpected error', { error: error.message });
        res.status(500).json({ error: 'Internal server error during Supabase authentication' });
    }
};


export const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userRole = req.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (allowedRoles.includes(userRole)) {
            next();
        } else {
            res.status(403).json({ error: 'Forbidden: You do not have the required role' });
        }
    };
};

export const checkPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const permissions = req.user.permissions || [];

        if (permissions.includes(permission) || permissions.includes('all:all')) {
            next();
        } else {
            res.status(403).json({ error: 'Forbidden: Missing permission ' + permission });
        }
    };
};

export const checkPlan = (allowedPlans) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // admin bypasses plan restrictions
        if (req.user.role === 'admin') {
            return next();
        }

        const userPlan = req.user.plan || 'no_plan';
        const plans = Array.isArray(allowedPlans) ? allowedPlans : [allowedPlans];

        if (plans.includes(userPlan) || plans.includes('all')) {
            next();
        } else {
            res.status(403).json({ error: 'Forbidden: Your subscription plan does not allow this action' });
        }
    };
};
