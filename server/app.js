import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

// Shared infrastructure
import { config } from './shared/config/index.js';
import { specs } from './shared/config/swagger.js';
import { errorHandler } from './shared/middleware/errorHandler.js';
import swaggerUi from 'swagger-ui-express';

// Module routes
import authRoutes from './modules/auth/auth.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import notesRoutes from './modules/notes/notes.routes.js';
import clientsRoutes from './modules/clients/clients.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ─── Global Middleware ───────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: false, // Required for Swagger UI to load correctly
}));
app.use(cors());
app.use(express.json({
    limit: '50mb',
    verify: (req, res, buf) => {
        // Preserve raw body for Stripe webhook verification
        if (req.originalUrl.startsWith('/api/stripe/webhook')) {
            req.rawBody = buf.toString();
        }
    }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// ─── API Documentation ──────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

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
