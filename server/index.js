import app from './app.js';
import { config } from './shared/config/index.js';
import logger from './shared/lib/logger.js';

// ─── Fail-Fast: Env Variable Validation ──────────────────────────────────────
// If any critical env var is missing, exit immediately with a clear error
// instead of failing silently at runtime when users hit those features.
const REQUIRED_ENV_VARS = [
    'GEMINI_API_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'VITE_SUPABASE_URL',
    'FRONTEND_URL',
];
const missingVars = REQUIRED_ENV_VARS.filter(key => !process.env[key]);
if (missingVars.length > 0) {
    console.error(`\n❌ FATAL: Missing required environment variables:\n   ${missingVars.join('\n   ')}\n`);
    console.error('Server will not start. Please check your .env file.\n');
    process.exit(1);
}

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`[Unhandled Rejection] ${reason}`, { promise });
});

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error(`[Uncaught Exception] ${error.message}`, { stack: error.stack });
    process.exit(1);
});

const PORT = config.port;

app.listen(PORT, () => {
    logger.info(`[NexusPro] Server running on port ${PORT}`, { env: config.nodeEnv });
});
