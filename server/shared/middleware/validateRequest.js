import logger from '../lib/logger.js';

export const validateRequest = (schema) => (req, res, next) => {
    try {
        req.body = schema.parse(req.body);
        next();
    } catch (error) {
        // If it's not a ZodError (no .errors array), let Express handle it
        if (!error.errors || !Array.isArray(error.errors)) {
            logger.error('Unexpected validation error (non-ZodError)', { message: error.message, path: req.path });
            return next(error);
        }
        logger.warn('Validation Error', {
            path: req.path,
            errors: error.errors,
            body: req.body
        });
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: error.errors.map(e => ({
                path: (e.path || []).join('.'),
                message: e.message
            }))
        });
    }
};
