import express from 'express';
import 'express-async-errors';
// Restart triggered by Antigravity at 2026-02-21
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

// Shared infrastructure
import { config } from './shared/config/index.js';
import { specs } from './shared/config/swagger.js';
import { errorHandler } from './shared/middleware/errorHandler.js';
import { globalLimiter } from './shared/middleware/rateLimiter.js';
import { requestLogger } from './shared/middleware/requestLogger.js';
import logger from './shared/lib/logger.js';
import swaggerUi from 'swagger-ui-express';

// Module routes
import authRoutes from './modules/auth/auth.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import notesRoutes from './modules/notes/notes.routes.js';
import clientsRoutes from './modules/clients/clients.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';

const JWT_SECRET = config.jwtSecret;
if (!JWT_SECRET) {
    console.error('CRITICAL: JWT_SECRET NOT SET IN CONFIG');
}
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ─── Global Middleware ───────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: false, // Required for Swagger UI to load correctly
}));
// ─── CORS Configuration (Hardened) ─────────────────────────────────
// Only allow requests from our own frontend origins.
// In development → Vite dev server. In production → your deployed domain.
const allowedOrigins = config.nodeEnv === 'production'
    ? [
        process.env.FRONTEND_URL || 'https://app.nexuspro.com', // ← change to real domain
    ]
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ];

app.use(cors({
    origin: (origin, callback) => {
        // Allow server-to-server (no origin) or whitelisted origins
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn(`[Security] CORS blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS policy'));
        }
    },
    credentials: true, // Allow Authorization headers
}));

app.use(express.json({
    limit: '1mb', // Harden Input Firewall
    verify: (req, res, buf) => {
        if (req.originalUrl.startsWith('/api/stripe/webhook')) {
            req.rawBody = buf.toString();
        }
    }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(requestLogger);

// ─── API Documentation ──────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// ─── Global API Limiter ─────────────────────────────────────────────
app.use('/api', globalLimiter);

// ─── Module Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/stripe', billingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', notesRoutes);          // Mounts /api/notes, /api/presets, /api/history
app.use('/api/clients', clientsRoutes);
app.use('/api/admin', adminRoutes);

// ─── Health Check ────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ─── Static File Serving (Production) ────────────────────────────────
if (config.nodeEnv === 'production') {
    const distPath = path.join(__dirname, '..', 'dist');

    // Serve compiled frontend assets
    app.use(express.static(distPath));

    // SPA catch-all: any non-API route serves index.html
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

// ─── Global Error Handler ────────────────────────────────────────────
app.use(errorHandler);

export default app;
