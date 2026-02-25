import { supabase } from '../../shared/lib/supabase.js';
import { z } from 'zod';
import logger from '../../shared/lib/logger.js';

export const NoteSchema = z.object({
    client_id: z.string().uuid().nullable().optional(),
    content: z.string().min(1, 'Note content is required'),
    case_tag: z.string().optional().default('Session Note'),
    is_verified: z.boolean().optional().default(false),
    quantitative_summary: z.any().nullable().optional(),
});

// ─── Ownership Guard ─────────────────────────────────────────────────────────
// Prevents ID-spoofing: verifies that the client_id belongs to this user.
const verifyClientOwnership = async (client_id, user_id) => {
    if (!client_id) return true; // No client linked — always OK
    const { data, error } = await supabase
        .from('clients')
        .select('id')
        .eq('id', client_id)
        .eq('user_id', user_id)
        .single();
    return !error && !!data;
};

export const saveNote = async (req, res) => {
    const { content, case_tag, quantitative_summary, is_verified, client_id } = req.body;
    const user_id = req.user.id;

    try {
        // Security: verify client belongs to this user before associating
        const ownsClient = await verifyClientOwnership(client_id, user_id);
        if (!ownsClient) {
            logger.warn(`[Security] ID spoofing attempt: user ${user_id} tried to use client ${client_id}`);
            return res.status(403).json({ error: 'You do not have access to this client' });
        }

        const { data, error } = await supabase
            .from('notes_history')
            .insert([{ user_id, content, case_tag, quantitative_summary, is_verified, client_id: client_id || null }])
            .select();

        if (error) {
            logger.error(`[Notes] Save failed for user ${user_id}`, { error: error.message });
            throw error;
        }

        logger.info(`[Notes] Note saved successfully`, { userId: user_id, noteId: data[0].id });
        res.status(201).json({ success: true, note: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateNote = async (req, res) => {
    const { id } = req.params;
    const { content, case_tag, quantitative_summary, is_verified, client_id } = req.body;
    const user_id = req.user.id;

    try {
        // Security: verify client belongs to this user before associating
        const ownsClient = await verifyClientOwnership(client_id, user_id);
        if (!ownsClient) {
            logger.warn(`[Security] ID spoofing attempt on update: user ${user_id} tried to use client ${client_id}`);
            return res.status(403).json({ error: 'You do not have access to this client' });
        }

        const { data, error } = await supabase
            .from('notes_history')
            .update({ content, case_tag, quantitative_summary, is_verified, client_id: client_id || null })
            .match({ id, user_id })
            .select();

        if (error) {
            logger.error(`[Notes] Update failed for note ${id}`, { error: error.message, userId: user_id });
            throw error;
        }

        logger.info(`[Notes] Note updated successfully`, { userId: user_id, noteId: id });
        res.json({ success: true, note: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getNotesByUser = async (req, res) => {
    const user_id = req.user.id;

    try {
        const { data, error } = await supabase
            .from('notes_history')
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        res.json(data);
    } catch (error) {
        logger.error('[Notes] getNotesByUser error', { error: error.message, userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
};


export const getNotesByClient = async (req, res) => {
    const { clientId } = req.params;
    const user_id = req.user.id;

    try {
        const { data, error } = await supabase
            .from('notes_history')
            .select('*')
            .eq('client_id', clientId)
            .eq('user_id', user_id) // Ensure user owns the note/client access
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(data);
    } catch (error) {
        logger.error('[Notes] getNotesByClient error', { error: error.message, clientId: req.params?.clientId, userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
};


export const deleteNote = async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;

    try {
        const { error } = await supabase
            .from('notes_history')
            .delete()
            .match({ id, user_id });

        if (error) {
            logger.error(`[Notes] Delete failed for note ${id}`, { error: error.message, userId: user_id });
            throw error;
        }

        logger.info(`[Notes] Note deleted`, { userId: user_id, noteId: id });
        res.json({ success: true, message: 'Note deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
