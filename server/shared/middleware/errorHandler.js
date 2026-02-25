import { config } from '../config/index.js';
import logger from '../lib/logger.js';

export const errorHandler = (err, req, res, next) => {
    logger.error(`${err.message}`, { stack: err.stack, path: req.path, method: req.method });

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        message,
        stack: config.nodeEnv === 'development' ? err.stack : undefined,
    });
};
