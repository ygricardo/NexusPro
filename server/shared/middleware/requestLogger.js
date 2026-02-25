import logger from '../lib/logger.js';

/**
 * Middleware to log all incoming requests and outgoing responses.
 * Implements masking for sensitive data.
 */
export const requestLogger = (req, res, next) => {
    const start = Date.now();

    // Mask sensitive fields in body
    const maskSensitiveData = (data) => {
        if (!data) return data;
        const masked = { ...data };
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey'];

        Object.keys(masked).forEach(key => {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                masked[key] = '********';
            } else if (typeof masked[key] === 'object' && masked[key] !== null) {
                masked[key] = maskSensitiveData(masked[key]);
            }
        });
        return masked;
    };

    // When the request finishes
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { method, originalUrl, ip } = req;
        const { statusCode } = res;
        const userId = req.user?.id || 'anonymous';
        const userEmail = req.user?.email || 'anonymous';

        const logData = {
            method,
            url: originalUrl,
            status: statusCode,
            duration: `${duration}ms`,
            ip,
            user: { id: userId, email: userEmail },
            query: req.query,
            body: maskSensitiveData(req.body)
        };

        const message = `[HTTP] ${method} ${originalUrl} - ${statusCode} (${duration}ms)`;

        if (statusCode >= 500) {
            logger.error(message, logData);
        } else if (statusCode >= 400) {
            logger.warn(message, logData);
        } else {
            logger.info(message, logData);
        }
    });

    next();
};
