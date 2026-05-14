-- ============================================================
-- Plans table — single source of truth for membership plans
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Table
CREATE TABLE IF NOT EXISTS public.plans (
    id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            text          NOT NULL UNIQUE,
    name            text          NOT NULL,
    description     text,
    price_cents     integer       NOT NULL CHECK (price_cents >= 0),
    currency        text          NOT NULL DEFAULT 'usd',
    interval        text          NOT NULL DEFAULT 'month' CHECK (interval IN ('month', 'year')),
    features        jsonb         NOT NULL DEFAULT '[]'::jsonb,
    modules         text[]        NOT NULL DEFAULT '{}',
    color           text          DEFAULT 'primary',
    is_active       boolean       NOT NULL DEFAULT true,
    display_order   integer       NOT NULL DEFAULT 0,
    created_at      timestamptz   NOT NULL DEFAULT now(),
    updated_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plans_slug_idx          ON public.plans (slug);
CREATE INDEX IF NOT EXISTS plans_is_active_idx     ON public.plans (is_active);
CREATE INDEX IF NOT EXISTS plans_display_order_idx ON public.plans (display_order);

-- 2. Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.plans_set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS plans_updated_at_trigger ON public.plans;
CREATE TRIGGER plans_updated_at_trigger
BEFORE UPDATE ON public.plans
FOR EACH ROW EXECUTE FUNCTION public.plans_set_updated_at();

-- 3. RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read ACTIVE plans
DROP POLICY IF EXISTS "plans_public_read_active" ON public.plans;
CREATE POLICY "plans_public_read_active"
ON public.plans FOR SELECT
USING (is_active = true);

-- Service role (backend) bypasses RLS automatically; admin writes go through backend.
-- We do NOT add a policy for client-side writes — all mutations must go through
-- the admin-authenticated backend endpoints.

-- 4. Seed: the 3 plans currently hardcoded in the system
INSERT INTO public.plans (slug, name, description, price_cents, currency, interval, features, modules, color, is_active, display_order)
VALUES
    (
        'basic',
        'Basic',
        'Essential tools for individual clinicians',
        1999,
        'usd',
        'month',
        '["Client Caseload Management (Add/Delete)", "Daily Data Generator Access"]'::jsonb,
        ARRAY['rbt_generator'],
        'neutral',
        true,
        1
    ),
    (
        'advanced',
        'Advanced',
        'For growing practices that need weekly reporting',
        4999,
        'usd',
        'month',
        '["All Basic Features", "Weekly Data Generator Access"]'::jsonb,
        ARRAY['rbt_generator', 'bcba_generator'],
        'primary',
        true,
        2
    ),
    (
        'elite',
        'Elite',
        'Full clinical suite including AI session notes',
        6999,
        'usd',
        'month',
        '["All Advanced Features", "Note Generator Access"]'::jsonb,
        ARRAY['rbt_generator', 'bcba_generator', 'note_generator'],
        'secondary',
        true,
        3
    )
ON CONFLICT (slug) DO NOTHING;
