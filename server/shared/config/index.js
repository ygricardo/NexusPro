import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.PORT || 5000,
    supabase: {
        url: process.env.VITE_SUPABASE_URL,
        anonKey: process.env.VITE_SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
    },
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
    },
    nodeEnv: process.env.NODE_ENV || 'development',
};
