import rateLimit from 'express-rate-limit';
import logger from '../lib/logger.js';

const onLimitReached = (req, res, options) => {
    logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.originalUrl,
        method: req.method,
        limitType: options.limitType || 'unknown'
    });
};

/**
 * Global rate limiter: prevents general API abuse.
 * Limits to 100 requests per 15 minutes per IP.
 */
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res, next, options) => {
        onLimitReached(req, res, { ...options, limitType: 'global' });
        res.status(options.statusCode).send(options.message);
    },
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    }
});

/**
 * Auth rate limiter: protects login and register from brute-force.
 * Very strict: 10 attempts per 15 minutes.
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        onLimitReached(req, res, { ...options, limitType: 'auth' });
        res.status(options.statusCode).send(options.message);
    },
    message: {
        success: false,
        message: 'Too many login attempts, please try again after 15 minutes'
    }
});

/**
 * AI API rate limiter: controls costs and prevents spam on Gemini endpoints.
 * Limits to 10 requests per minute.
 */
export const aiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        onLimitReached(req, res, { ...options, limitType: 'ai' });
        res.status(options.statusCode).send(options.message);
    },
    message: {
        success: false,
        message: 'AI generation limit reached, please wait a minute'
    }
});
