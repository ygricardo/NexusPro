import { supabase } from '../../shared/lib/supabase.js';

export const saveEntry = async (req, res) => {
    const { module_type, input_data, output_data, client_id } = req.body;
    const userId = req.user.id;

    if (!module_type || !input_data || !output_data) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    try {
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

        if (error) throw error;

        return res.status(201).json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('[History Controller] Save Error:', error);
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
        console.error('[History Controller] Get Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch history.' });
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

        if (error) throw error;

        return res.status(200).json({
            success: true,
            message: 'History entry deleted successfully.'
        });
    } catch (error) {
        console.error('[History Controller] Delete Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete entry.' });
    }
};
