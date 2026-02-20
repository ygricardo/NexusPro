import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-secret-change-me';

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
        console.error('[AuthMiddleware] Token verification failed:', error.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
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
