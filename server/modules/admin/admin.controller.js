import { createClient } from '@supabase/supabase-js';
import { config } from '../../shared/config/index.js';

// Initialize Supabase Admin Client — specialized client that bypasses RLS
let supabaseAdmin;

const getAdminClient = () => {
    if (supabaseAdmin) return supabaseAdmin;

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('[Admin Controller] Missing Configuration: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set.');
        return null;
    }

    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    return supabaseAdmin;
};

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

    const adminClient = getAdminClient();
    if (!adminClient) {
        return res.status(500).json({
            success: false,
            message: 'Server misconfiguration: Admin access not available.'
        });
    }

    try {
        console.log(`[Admin API] Updating user ${id}:`, updates);

        const { data, error } = await adminClient
            .from('profiles')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) {
            console.error('[Admin API] Update failed:', error);
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
        console.error('[Admin API] Unexpected error:', err);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const deleteUser = async (req, res) => {
    const { id } = req.params;

    const adminClient = getAdminClient();
    if (!adminClient) {
        return res.status(500).json({
            success: false,
            message: 'Server misconfiguration: Admin access not available.'
        });
    }

    try {
        console.log(`[Admin API] Deleting user ${id}`);

        const { error: authError } = await adminClient.auth.admin.deleteUser(id);

        if (authError) {
            console.warn('[Admin API] Auth Delete Error (User might not exist in Auth or other issue):', authError.message);
        }

        const { error: profileError } = await adminClient
            .from('profiles')
            .delete()
            .eq('id', id);

        if (profileError) {
            console.error('[Admin API] Profile Delete Error:', profileError);
            return res.status(400).json({ success: false, message: `Profile delete failed: ${profileError.message}` });
        }

        return res.status(200).json({
            success: true,
            message: 'User deleted successfully.'
        });

    } catch (err) {
        console.error('[Admin API] Unexpected error in delete:', err);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
