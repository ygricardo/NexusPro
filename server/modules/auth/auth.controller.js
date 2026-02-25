import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase, supabaseAdmin } from '../../shared/lib/supabase.js';
import { config } from '../../shared/config/index.js';
import logger from '../../shared/lib/logger.js';

const JWT_SECRET = config.jwtSecret;
const TOKEN_EXPIRY = '24h';

export const register = async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password) {
        logger.warn('[Auth] Registration attempt with missing credentials', { email: email || 'MISSING' });
        return res.status(400).json({ error: 'Email and password are required' });
    }

    logger.info('[Auth] New registration attempt', { email });

    try {
        // 1. Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // 2. Register in Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name, role: 'user' }
            }
        });

        if (error) {
            logger.error('[Auth] Registration failed at Supabase Auth', { email, error: error.message });
            throw error;
        }

        // 3. Update profile with our custom hashed password if needed (for custom login)
        const user = data.user;
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                email,
                name,
                role_id: 'user',
                created_at: new Date().toISOString()
            });

        if (profileError) {
            logger.error('[Auth] Profile creation failed after Supabase Auth signup', { email, userId: user.id, error: profileError.message });
            throw profileError;
        }

        logger.info('[Auth] User registered successfully', { email, userId: user.id });
        res.status(201).json({ message: 'User registered successfully', userId: user.id });
    } catch (error) {
        logger.error('[Auth] Registration error', { email, error: error.message });
        res.status(500).json({ error: error.message });
    }
};


export const login = async (req, res) => {
    const { email, password } = req.body;
    logger.debug(`[Auth] Login attempt`, { email });

    try {
        // 1. Verify password with Supabase Auth FIRST
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) {
            logger.warn(`[Auth] Login failed for ${email}: ${authError.message}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = authData.user;
        const session = authData.session;
        logger.info(`[Auth] Login successful for ${email}`, { userId: user.id });

        // 2. Get user from profiles (including role)
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*, roles(*, role_permissions(permission_name))')
            .eq('id', user.id)
            .single();

        let userRole = 'user';
        let permissions = [];
        let userName = user.user_metadata?.name || email.split('@')[0];

        if (error || !profile) {
            logger.warn(`[Auth] Profile not found or RLS blocked access for ${email}`, { error: error?.message });
        } else {
            logger.debug(`[Auth] Profile found for ${email}`, { role: profile.role_id });
            userRole = profile.role_id || 'user';
            permissions = profile.roles?.role_permissions?.map(rp => rp.permission_name) || [];
            userName = profile.name || userName;
        }

        const access = profile?.access || [];

        // 3. Generate JWT
        const token = jwt.sign(
            {
                sub: user.id,
                email: user.email,
                role: userRole,
                permissions,
                access
            },
            JWT_SECRET,
            { expiresIn: TOKEN_EXPIRY }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: userName,
                role: userRole,
                permissions,
                access
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getProfile = async (req, res) => {
    if (!supabaseAdmin) {
        logger.error('[Auth] getProfile - supabaseAdmin client unavailable');
        return res.status(500).json({ error: 'Supabase service role unavailable' });
    }

    if (!req.user || !req.user.id) {
        logger.warn('[Auth] getProfile - Missing user ID in request');
        return res.status(401).json({ error: 'Unauthorized: No user session found' });
    }

    try {
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('*, roles(*, role_permissions(permission_name))')
            .eq('id', req.user.id)
            .single();

        if (error || !profile) {
            logger.warn(`[Auth] getProfile - Profile not found for ${req.user.id}`, { error: error?.message });
            return res.json({ user: req.user });
        }

        logger.debug(`[Auth] Fresh Profile Data for ${profile.email}`, { plan: profile.plan });

        const freshUser = {
            id: profile.id,
            email: profile.email || req.user.email,
            name: profile.name || req.user.name,
            role: profile.role_id || 'user',
            plan: profile.plan || 'basic',
            permissions: profile.roles?.role_permissions?.map(rp => rp.permission_name) || [],
            access: profile.access || []
        };

        res.json({ user: freshUser });

    } catch (err) {
        logger.error('[Auth] getProfile error', { error: err.message });
        res.status(500).json({ error: err.message });
    }
};
