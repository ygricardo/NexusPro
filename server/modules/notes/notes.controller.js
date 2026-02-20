import { supabase } from '../../shared/lib/supabase.js';

export const saveNote = async (req, res) => {
    const { content, case_tag, quantitative_summary, is_verified, client_id } = req.body;
    const user_id = req.user.id;

    try {
        const { data, error } = await supabase
            .from('notes_history')
            .insert([
                { user_id, content, case_tag, quantitative_summary, is_verified, client_id: client_id || null }
            ])
            .select();

        if (error) throw error;

        res.status(201).json({ success: true, note: data[0] });
    } catch (error) {
        console.error('Error saving note:', error);
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
        console.error('Error fetching notes:', error);
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
        console.error('Error fetching client notes:', error);
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

        if (error) throw error;

        res.json({ success: true, message: 'Note deleted' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: error.message });
    }
};
