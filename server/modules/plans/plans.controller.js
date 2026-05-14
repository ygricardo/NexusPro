import { supabaseAdmin } from '../../shared/lib/supabase.js';
import logger from '../../shared/lib/logger.js';

const SLUG_REGEX = /^[a-z0-9_-]+$/;

const sanitizePlanPayload = (body, { partial = false } = {}) => {
    const out = {};
    const errors = [];

    if (body.slug !== undefined) {
        if (typeof body.slug !== 'string' || !SLUG_REGEX.test(body.slug)) {
            errors.push('slug must be lowercase letters, digits, underscore or hyphen');
        } else {
            out.slug = body.slug;
        }
    } else if (!partial) {
        errors.push('slug is required');
    }

    if (body.name !== undefined) {
        if (typeof body.name !== 'string' || body.name.trim().length === 0) {
            errors.push('name is required');
        } else {
            out.name = body.name.trim();
        }
    } else if (!partial) {
        errors.push('name is required');
    }

    if (body.description !== undefined) {
        out.description = body.description === null ? null : String(body.description);
    }

    if (body.price_cents !== undefined) {
        const n = Number(body.price_cents);
        if (!Number.isInteger(n) || n < 0) {
            errors.push('price_cents must be a non-negative integer');
        } else {
            out.price_cents = n;
        }
    } else if (!partial) {
        errors.push('price_cents is required');
    }

    if (body.currency !== undefined) {
        if (typeof body.currency !== 'string' || body.currency.length !== 3) {
            errors.push('currency must be a 3-letter ISO code');
        } else {
            out.currency = body.currency.toLowerCase();
        }
    }

    if (body.interval !== undefined) {
        if (!['month', 'year'].includes(body.interval)) {
            errors.push('interval must be "month" or "year"');
        } else {
            out.interval = body.interval;
        }
    }

    if (body.features !== undefined) {
        if (!Array.isArray(body.features) || body.features.some(f => typeof f !== 'string')) {
            errors.push('features must be an array of strings');
        } else {
            out.features = body.features;
        }
    }

    if (body.modules !== undefined) {
        if (!Array.isArray(body.modules) || body.modules.some(m => typeof m !== 'string')) {
            errors.push('modules must be an array of strings');
        } else {
            out.modules = body.modules;
        }
    }

    if (body.color !== undefined) {
        out.color = body.color === null ? null : String(body.color);
    }

    if (body.is_active !== undefined) {
        out.is_active = Boolean(body.is_active);
    }

    if (body.display_order !== undefined) {
        const n = Number(body.display_order);
        if (!Number.isInteger(n)) {
            errors.push('display_order must be an integer');
        } else {
            out.display_order = n;
        }
    }

    return { data: out, errors };
};

// Public endpoint — returns only active plans, ordered for the pricing page
export const listActivePlans = async (req, res) => {
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, message: 'Database client unavailable' });
    }
    try {
        const { data, error } = await supabaseAdmin
            .from('plans')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });

        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (err) {
        logger.error('[Plans API] listActivePlans failed', { error: err.message });
        res.status(500).json({ success: false, message: err.message });
    }
};

// Admin endpoint — returns all plans (active + inactive)
export const listAllPlans = async (req, res) => {
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, message: 'Admin client unavailable' });
    }
    try {
        const { data, error } = await supabaseAdmin
            .from('plans')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (err) {
        logger.error('[Plans API] listAllPlans failed', { error: err.message, adminId: req.user?.id });
        res.status(500).json({ success: false, message: err.message });
    }
};

export const createPlan = async (req, res) => {
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, message: 'Admin client unavailable' });
    }

    const { data: payload, errors } = sanitizePlanPayload(req.body, { partial: false });
    if (errors.length) {
        return res.status(400).json({ success: false, message: errors.join('; ') });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('plans')
            .insert(payload)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({ success: false, message: 'A plan with that slug already exists' });
            }
            throw error;
        }

        logger.info('[Plans API] Plan created', { slug: data.slug, adminId: req.user?.id });
        res.status(201).json({ success: true, data });
    } catch (err) {
        logger.error('[Plans API] createPlan failed', { error: err.message, adminId: req.user?.id });
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updatePlan = async (req, res) => {
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, message: 'Admin client unavailable' });
    }

    const { id } = req.params;
    const { data: payload, errors } = sanitizePlanPayload(req.body, { partial: true });
    if (errors.length) {
        return res.status(400).json({ success: false, message: errors.join('; ') });
    }
    if (Object.keys(payload).length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('plans')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({ success: false, message: 'A plan with that slug already exists' });
            }
            throw error;
        }
        if (!data) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        logger.info('[Plans API] Plan updated', { id, slug: data.slug, adminId: req.user?.id });
        res.json({ success: true, data });
    } catch (err) {
        logger.error('[Plans API] updatePlan failed', { error: err.message, id, adminId: req.user?.id });
        res.status(500).json({ success: false, message: err.message });
    }
};

export const togglePlan = async (req, res) => {
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, message: 'Admin client unavailable' });
    }
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
        return res.status(400).json({ success: false, message: 'is_active (boolean) is required' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('plans')
            .update({ is_active })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        logger.info('[Plans API] Plan toggled', { id, slug: data.slug, is_active, adminId: req.user?.id });
        res.json({ success: true, data });
    } catch (err) {
        logger.error('[Plans API] togglePlan failed', { error: err.message, id, adminId: req.user?.id });
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deletePlan = async (req, res) => {
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, message: 'Admin client unavailable' });
    }
    const { id } = req.params;

    try {
        // Look up the plan first so we can check for active subscribers
        const { data: plan, error: planErr } = await supabaseAdmin
            .from('plans')
            .select('slug, name')
            .eq('id', id)
            .single();

        if (planErr || !plan) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        const { count: subscriberCount, error: countErr } = await supabaseAdmin
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('plan', plan.slug);

        if (countErr) throw countErr;

        if ((subscriberCount || 0) > 0) {
            return res.status(409).json({
                success: false,
                message: `Cannot delete plan "${plan.name}": ${subscriberCount} user(s) currently have it. Deactivate it instead.`,
                subscriberCount
            });
        }

        const { error: delErr } = await supabaseAdmin
            .from('plans')
            .delete()
            .eq('id', id);

        if (delErr) throw delErr;

        logger.warn('[Plans API] Plan deleted', { id, slug: plan.slug, adminId: req.user?.id });
        res.json({ success: true, message: 'Plan deleted' });
    } catch (err) {
        logger.error('[Plans API] deletePlan failed', { error: err.message, id, adminId: req.user?.id });
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── Helpers reused by billing.controller.js ─────────────────────────
export const getPlanBySlug = async (slug) => {
    if (!supabaseAdmin) return null;
    const { data, error } = await supabaseAdmin
        .from('plans')
        .select('*')
        .eq('slug', slug)
        .single();
    if (error) {
        logger.warn('[Plans] getPlanBySlug failed', { slug, error: error.message });
        return null;
    }
    return data;
};
