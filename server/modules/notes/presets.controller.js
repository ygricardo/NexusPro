import { supabase } from '../../shared/lib/supabase.js';
import logger from '../../shared/lib/logger.js';
import { z } from 'zod';

export const PresetSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    config: z.any(),
});


export const createPreset = async (req, res) => {
    const { name, config } = req.body;
    const userId = req.user.id;

    if (!name || !config) {
        return res.status(400).json({ success: false, message: 'Name and config are required.' });
    }

    try {
        const { data, error } = await supabase
            .from('presets')
            .insert({
                user_id: userId,
                name: name,
                config: config
            })
            .select()
            .single();

        if (error) {
            logger.error('[Presets] Create failed', { error: error.message, userId });
            throw error;
        }

        logger.info('[Presets] Preset created', { userId, presetId: data.id, name });
        return res.status(201).json({
            success: true,
            data: data
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to create preset.' });
    }
};

export const getPresets = async (req, res) => {
    const userId = req.user.id;

    try {
        const { data, error } = await supabase
            .from('presets')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        logger.error('[Presets] getPresets error', { error: error.message, userId: req.user?.id });
        return res.status(500).json({ success: false, message: 'Failed to fetch presets.' });
    }

};

export const deletePreset = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const { error } = await supabase
            .from('presets')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            logger.error('[Presets] Delete failed', { error: error.message, userId, presetId: id });
            throw error;
        }

        logger.info('[Presets] Preset deleted', { userId, presetId: id });
        return res.status(200).json({
            success: true,
            message: 'Preset deleted successfully.'
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete preset.' });
    }
};
