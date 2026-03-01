import { supabaseAdmin } from '../../shared/lib/supabase.js';
import logger from '../../shared/lib/logger.js';

export const updateUserProfile = async (req, res) => {
    const { id } = req.params;
    const { plan, role, access } = req.body;

    const updates = {};
    if (plan !== undefined) updates.plan = plan;
    if (role !== undefined) updates.role = role;
    if (access !== undefined) {
        updates.access = Array.isArray(access) ? access : [];
    }

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields to update.' });
    }

    if (!supabaseAdmin) {
        return res.status(500).json({
            success: false,
            message: 'Server misconfiguration: Admin access not available.'
        });
    }

    try {
        // Core system protection check
        const { data: userAuth } = await supabaseAdmin.auth.admin.getUserById(id);
        const isCoreAdmin = userAuth?.user?.email === 'admin@nexuspro.com';

        if (isCoreAdmin && role === 'user') {
            return res.status(403).json({ success: false, message: 'Safety check: Cannot demote the primary system administrator.' });
        }

        logger.info(`[Admin API] Updating user ${id}`, { updates, adminId: req.user?.id });

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) {
            logger.error(`[Admin API] Update failed for ${id}`, { error: error.message });
            return res.status(400).json({ success: false, message: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found or update failed.' });
        }

        return res.status(200).json({
            success: true,
            data: data[0],
            message: 'User updated successfully via Admin API.'
        });

    } catch (err) {
        logger.error('[Admin API] Unexpected error', { error: err.message, adminId: req.user?.id });
        res.status(500).json({ error: err.message });
    }
};

export const deleteUser = async (req, res) => {
    const { id } = req.params;

    if (!supabaseAdmin) {
        return res.status(500).json({
            success: false,
            message: 'Server misconfiguration: Admin access not available.'
        });
    }

    try {
        const { data: userAuth } = await supabaseAdmin.auth.admin.getUserById(id);
        if (userAuth?.user?.email === 'admin@nexuspro.com') {
            return res.status(403).json({ success: false, message: 'Safety check: Cannot delete the primary system administrator.' });
        }

        logger.warn(`[Admin API] Deleting user ${id}`, { adminId: req.user?.id });

        // 1. Delete from Supabase Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

        if (authError) {
            logger.warn('[Admin API] Auth Delete Error (User might not exist in Auth or other issue)', { error: authError.message });
        }

        // 2. Delete from Profiles table
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', id);

        if (profileError) {
            logger.error('[Admin API] Profile Delete Error', { error: profileError.message });
            return res.status(400).json({ success: false, message: `Profile delete failed: ${profileError.message}` });
        }

        return res.status(200).json({
            success: true,
            message: 'User deleted successfully.'
        });

    } catch (err) {
        logger.error('[Admin API] Unexpected error in delete', { error: err.message, adminId: req.user?.id });
        res.status(500).json({ error: err.message });
    }
};

export const getLogs = async (req, res) => {
    const { level, limit = 50, page = 0 } = req.query;

    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, message: 'Admin client unavailable' });
    }

    try {
        let query = supabaseAdmin
            .from('audit_logs')
            .select('*', { count: 'exact' });

        if (level && level !== 'all') {
            query = query.eq('level', level.toLowerCase());
        }

        query = query.order('timestamp', { ascending: false })
            .range(page * limit, (page + 1) * limit - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        logger.error('[Admin API] Error fetching logs', { error: error.message });
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getUsers = async (req, res) => {
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, message: 'Admin client unavailable' });
    }

    try {
        logger.debug('[Admin API] Fetching all users', { adminId: req.user?.id });
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('*');

        if (error) throw error;

        logger.info(`[Admin API] Successfully fetched users`, { count: data?.length || 0, adminId: req.user?.id });
        res.json({ success: true, data });
    } catch (error) {
        logger.error('[Admin API] Error fetching users', { error: error.message, adminId: req.user?.id });
        res.status(500).json({ success: false, message: error.message });
    }
};
