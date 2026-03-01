import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { config } from '../../shared/config/index.js';
import { z } from 'zod';
import logger from '../../shared/lib/logger.js';

// ─── Zod Schema ───────────────────────────────────────────────────────
export const ClientSchema = z.object({
    first_name: z.string().min(1, 'First name is required').max(100),
    last_name: z.string().min(1, 'Last name is required').max(100),
});

export const DailyRecordSchema = z.object({
    client_id: z.string().uuid(),
    behavior_name: z.string().min(1, 'Behavior name is required'),
    data_json: z.any(),
    total: z.number().int().min(0, 'Total must be non-negative'),
});

export const WeeklyRecordSchema = z.object({
    client_id: z.string().uuid(),
    behavior_name: z.string().min(1, 'Behavior name is required'),
    data_json: z.any(),
    baseline: z.number().int().min(0, 'Baseline must be non-negative').nullable().optional(),
    trend: z.string().nullable().optional(),
});


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
        logger.error('[Clients] Error in getClients', { error: error.message, userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
};

export const createClient = async (req, res) => {
    try {
        const supabase = getAdminSupabase();

        const { first_name, last_name } = req.body;

        logger.debug('[Clients] Creating client', { first_name, last_name, userId: req.user?.id });

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
            logger.error('[Clients] Create failed', { error: error.message, userId: req.user?.id });
            throw error;
        }
        logger.info('[Clients] Client created successfully', { clientId: data.id, userId: req.user.id });
        res.status(201).json(data);
    } catch (error) {
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

        if (error) {
            logger.error('[Clients] Update failed', { error: error.message, clientId: id, userId: req.user.id });
            throw error;
        }
        logger.info('[Clients] Client updated', { clientId: id, userId: req.user.id });
        res.json(data);
    } catch (error) {
        logger.error('[Clients] updateClient error', { error: error.message, clientId: req.params?.id, userId: req.user?.id });
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
        logger.info('[Clients] Client deleted', { clientId: id, userId: req.user.id });
        res.json({ message: 'Client deleted' });
    } catch (error) {
        logger.error('[Clients] Delete failed', { error: error.message, clientId: id });
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

        if (error) {
            logger.error('[Clients] saveDailyRecord failed', { error: error.message, clientId: client_id, userId: user_id });
            throw error;
        }
        logger.info('[Clients] Daily record saved', { clientId: client_id, userId: user_id, recordId: data.id });
        res.status(201).json(data);
    } catch (error) {
        logger.error('[Clients] saveDailyRecord error', { error: error.message, userId: req.user?.id });
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

        if (error) {
            logger.error('[Clients] saveWeeklyRecord failed', { error: error.message, clientId: client_id, userId: user_id });
            throw error;
        }
        logger.info('[Clients] Weekly record saved', { clientId: client_id, userId: user_id, recordId: data.id });
        res.status(201).json(data);
    } catch (error) {
        logger.error('[Clients] saveWeeklyRecord error', { error: error.message, userId: req.user?.id });
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

        if (error) {
            logger.error('[Clients] getClientById failed', { error: error.message, clientId: id, userId: req.user.id });
            throw error;
        }
        res.json(data);
    } catch (error) {
        logger.error('[Clients] getClientById error', { error: error.message, clientId: req.params?.id, userId: req.user?.id });
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

        // Fetch Generation History for Daily (RBT) and Weekly (BCBA)
        const { data: genHistory, error: genError } = await supabase
            .from('generation_history')
            .select('*')
            .eq('client_id', id)
            .eq('user_id', user_id)
            .order('created_at', { ascending: false });

        if (genError) throw genError;

        const daily = [];
        const weekly = [];

        genHistory.forEach(hist => {
            if (hist.module_type === 'RBT') {
                if (Array.isArray(hist.output_data)) {
                    daily.push({
                        id: hist.id,
                        created_at: hist.created_at,
                        input_data: hist.input_data,
                        output_data: hist.output_data,
                        behaviors: hist.output_data.filter(item => item.name).map(item => ({
                            name: item.name,
                            total: item.total || 0,
                            data: item.data || []
                        }))
                    });
                }
            } else if (hist.module_type === 'BCBA') {
                if (hist.input_data) {
                    weekly.push({
                        id: hist.id,
                        created_at: hist.created_at,
                        input_data: hist.input_data,
                        output_data: hist.output_data,
                        maladaptives: hist.input_data.maladaptives?.filter(item => item.name) || [],
                        replacements: hist.input_data.replacements?.filter(item => item.name) || []
                    });
                }
            }
        });

        res.json({
            notes: notes || [],
            daily: daily,
            weekly: weekly
        });
    } catch (error) {
        logger.error('[Clients] getClientHistory error', { error: error.message, clientId: req.params?.id, userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
};

