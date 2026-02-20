import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { config } from '../../shared/config/index.js';

// Initialize Supabase Admin client to bypass RLS issues with custom JWTs
const getAdminSupabase = () => {
    return createSupabaseClient(config.supabase.url, config.supabase.serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};

export const getClients = async (req, res) => {
    try {
        const supabase = getAdminSupabase();
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('user_id', req.user.id) // Manual RLS
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error in getClients:', error);
        res.status(500).json({ error: error.message });
    }
};

export const createClient = async (req, res) => {
    try {
        const supabase = getAdminSupabase();
        const { first_name, last_name } = req.body;

        console.log('[createClient] Request body:', req.body);
        console.log('[createClient] User ID:', req.user?.id);

        const { data, error } = await supabase
            .from('clients')
            .insert([{
                first_name,
                last_name,
                user_id: req.user.id
            }])
            .select()
            .single();

        if (error) {
            console.error('[createClient] Supabase error:', error);
            throw error;
        }
        res.status(201).json(data);
    } catch (error) {
        console.error('Error in createClient:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateClient = async (req, res) => {
    try {
        const supabase = getAdminSupabase();
        const { id } = req.params;
        const updates = req.body;

        // Prevent updating ownership
        delete updates.user_id;

        // Allowed updates
        const allowedUpdates = {
            first_name: updates.first_name,
            last_name: updates.last_name
        };

        const { data, error } = await supabase
            .from('clients')
            .update(allowedUpdates)
            .eq('id', id)
            .eq('user_id', req.user.id) // Manual RLS
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error in updateClient:', error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteClient = async (req, res) => {
    try {
        const supabase = getAdminSupabase();
        const { id } = req.params;

        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id); // Manual RLS

        if (error) throw error;
        res.json({ message: 'Client deleted' });
    } catch (error) {
        console.error('Error in deleteClient:', error);
        res.status(500).json({ error: error.message });
    }
};

export const saveDailyRecord = async (req, res) => {
    try {
        const supabase = getAdminSupabase();
        const { client_id, behavior_name, data_json, total } = req.body;
        const user_id = req.user.id;

        const { data, error } = await supabase
            .from('daily_records')
            .insert([{ client_id, user_id, behavior_name, data_json, total }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Error in saveDailyRecord:', error);
        res.status(500).json({ error: error.message });
    }
};

export const saveWeeklyRecord = async (req, res) => {
    try {
        const supabase = getAdminSupabase();
        const { client_id, behavior_name, data_json, baseline, trend } = req.body;
        const user_id = req.user.id;

        const { data, error } = await supabase
            .from('weekly_records')
            .insert([{ client_id, user_id, behavior_name, data_json, baseline, trend }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Error in saveWeeklyRecord:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getClientById = async (req, res) => {
    try {
        const supabase = getAdminSupabase();
        const { id } = req.params;

        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user.id) // Manual RLS
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error in getClientById:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getClientHistory = async (req, res) => {
    try {
        const supabase = getAdminSupabase();
        const { id } = req.params;
        const user_id = req.user.id;

        // Fetch Notes
        const { data: notes, error: notesError } = await supabase
            .from('notes_history')
            .select('*')
            .eq('client_id', id)
            .eq('user_id', user_id)
            .order('created_at', { ascending: false });

        if (notesError) throw notesError;

        // Fetch Daily Records
        const { data: daily, error: dailyError } = await supabase
            .from('daily_records')
            .select('*')
            .eq('client_id', id)
            .eq('user_id', user_id)
            .order('created_at', { ascending: false });

        if (dailyError) throw dailyError;

        // Fetch Weekly Records
        const { data: weekly, error: weeklyError } = await supabase
            .from('weekly_records')
            .select('*')
            .eq('client_id', id)
            .eq('user_id', user_id)
            .order('created_at', { ascending: false });

        if (weeklyError) throw weeklyError;

        res.json({
            notes: notes || [],
            daily: daily || [],
            weekly: weekly || []
        });
    } catch (error) {
        console.error('Error in getClientHistory:', error);
        res.status(500).json({ error: error.message });
    }
};
