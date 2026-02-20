import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../shared/config/index.js';

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey || config.supabase.anonKey);

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-secret-change-me';
const TOKEN_EXPIRY = '24h';

export const register = async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

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

        if (error) throw error;

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

        if (profileError) throw profileError;

        res.status(201).json({ message: 'User registered successfully', userId: user.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        console.log(`[Auth] Login attempt for: ${email}`);

        // 1. Verify password with Supabase Auth FIRST
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) {
            console.error(`[Auth] Supabase Auth error:`, authError.message);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = authData.user;
        const session = authData.session;
        console.log(`[Auth] Supabase Auth successful for ${email}, User ID: ${user.id}`);

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
            console.warn(`[Auth] Profile not found or RLS blocked access. Using default 'user' role. Error:`, error?.message);
        } else {
            console.log(`[Auth] Profile found, role: ${profile.role_id}`);
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
    // Initialize Admin/Service Client for reliable profile fetching
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    if (!req.user || !req.user.id) {
        console.warn('[Auth] getProfile - Missing user ID in request');
        return res.status(401).json({ error: 'Unauthorized: No user session found' });
    }

    try {
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('*, roles(*, role_permissions(permission_name))')
            .eq('id', req.user.id)
            .single();

        if (error || !profile) {
            console.warn('[Auth] getProfile - Profile not found or error, returning JWT payload as fallback:', error?.message);
            return res.json({ user: req.user });
        }

        console.log(`[Auth] Fresh Profile Data for ${profile.email}: Plan=${profile.plan}, Access=${JSON.stringify(profile.access)}`);

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
        console.error('[Auth] getProfile error:', err);
        res.json({ user: req.user });
    }
};
