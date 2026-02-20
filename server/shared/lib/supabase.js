import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

if (!config.supabase.url || !config.supabase.anonKey) {
    console.error('Missing Supabase Environment Variables');
}

export const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey || config.supabase.anonKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);
