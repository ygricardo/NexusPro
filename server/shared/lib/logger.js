import winston from 'winston';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

// Custom Supabase Transport for Winston
class SupabaseTransport extends winston.Transport {
    constructor(opts) {
        super(opts);
        this.supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
    }

    async log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        const { level, message, ...meta } = info;

        try {
            await this.supabase.from('audit_logs').insert([{
                level,
                message,
                meta,
                timestamp: new Date().toISOString()
            }]);
        } catch (err) {
            console.error('[Logger] Failed to save log to Supabase:', err.message);
        }

        callback();
    }
}

// Create the logger
const logger = winston.createLogger({
    level: config.nodeEnv === 'development' ? 'debug' : 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        // Always log to console
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        // Log to Supabase for persistence and Admin View
        new SupabaseTransport()
    ]
});

export default logger;
