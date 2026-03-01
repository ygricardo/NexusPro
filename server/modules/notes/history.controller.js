import { supabase } from '../../shared/lib/supabase.js';
import { z } from 'zod';
import logger from '../../shared/lib/logger.js';

// ─── Zod Schema ───────────────────────────────────────────────────────
// Validates incoming history entries from the RBT and BCBA generators
export const HistoryEntrySchema = z.object({
    module_type: z.enum(['RBT', 'BCBA']),
    input_data: z.any(),
    output_data: z.any(),
    client_id: z.string().uuid().nullable().optional(),
});


export const saveEntry = async (req, res) => {
    const { module_type, input_data, output_data, client_id } = req.body;
    const userId = req.user.id;

    try {
        // ── ID Spoofing Guard ─────────────────────────────────────────────────
        // If a client_id is provided, verify the requesting user actually owns it
        if (client_id) {
            const { data: clientAccess } = await supabase
                .from('clients')
                .select('id')
                .eq('id', client_id)
                .eq('user_id', userId)
                .single();

            if (!clientAccess) {
                logger.error(`[Security] ID Spoofing attempt in saveEntry: user ${userId} tried to use client ${client_id}`);
                return res.status(403).json({ success: false, message: 'Access denied: invalid client_id.' });
            }
        }

        const { data, error } = await supabase
            .from('generation_history')
            .insert({
                user_id: userId,
                client_id: client_id || null,
                module_type: module_type,
                input_data: input_data,
                output_data: output_data
            })
            .select()
            .single();

        if (error) {
            logger.error('[History] Save failed', { error: error.message, userId });
            throw error;
        }

        logger.info('[History] Entry saved', { userId, historyId: data.id, moduleType: module_type });
        return res.status(201).json({
            success: true,
            data: data
        });
    } catch (error) {
        logger.error('[History Controller] Save Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to save history.' });
    }
};


export const getHistory = async (req, res) => {
    const userId = req.user.id;
    const { type } = req.params;

    if (!type) {
        return res.status(400).json({ success: false, message: 'Module type is required.' });
    }

    try {
        let query = supabase
            .from('generation_history')
            .select('*, clients (first_name, last_name)')
            .eq('user_id', userId);

        if (type !== 'ALL') {
            query = query.eq('module_type', type);
        }

        const { data, error } = await query
            .order('created_at', { ascending: false })
            .limit(30);

        if (error) throw error;

        return res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        logger.error('[History] getHistory error', { error: error.message, userId: req.user?.id, type });
        return res.status(500).json({ success: false, message: 'Failed to fetch history.' });
    }
};


export const updateEntry = async (req, res) => {
    const { id } = req.params;
    const { module_type, input_data, output_data, client_id } = req.body;
    const userId = req.user.id;

    try {
        // ── ID Spoofing Guard ─────────────────────────────────────────────────
        if (client_id) {
            const { data: clientAccess } = await supabase
                .from('clients')
                .select('id')
                .eq('id', client_id)
                .eq('user_id', userId)
                .single();

            if (!clientAccess) {
                logger.error(`[Security] ID Spoofing attempt in updateEntry: user ${userId} tried to use client ${client_id}`);
                return res.status(403).json({ success: false, message: 'Access denied: invalid client_id.' });
            }
        }

        const { data, error } = await supabase
            .from('generation_history')
            .update({
                client_id: client_id || null,
                module_type: module_type,
                input_data: input_data,
                output_data: output_data
            })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            logger.error('[History] Update failed', { error: error.message, userId, entryId: id });
            throw error;
        }

        logger.info('[History] Entry updated', { userId, historyId: id, moduleType: module_type });
        return res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        logger.error('[History Controller] Update Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to update history.' });
    }
};


export const deleteEntry = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const { error } = await supabase
            .from('generation_history')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            logger.error('[History] Delete failed', { error: error.message, userId, entryId: id });
            throw error;
        }

        logger.info('[History] Entry deleted', { userId, entryId: id });
        return res.status(200).json({
            success: true,
            message: 'History entry deleted successfully.'
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete entry.' });
    }
};
