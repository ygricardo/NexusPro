-- =============================================================
-- NexusPro: Auto-create profile on new Supabase user
-- Works for both Google OAuth and Email/Password signups.
-- Run this once in Supabase Dashboard → SQL Editor.
-- =============================================================

-- 1. Function: create profile row on new auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_email TEXT;
BEGIN
  -- Extract email and display name (works for both Google OAuth and email/password)
  v_email := NEW.email;
  v_name  := COALESCE(
                NEW.raw_user_meta_data->>'full_name',   -- Google OAuth
                NEW.raw_user_meta_data->>'name',        -- email signup
                split_part(NEW.email, '@', 1)           -- fallback: use email prefix
              );

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role_id,
    plan,
    subscription_status,
    access,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    v_email,
    v_name,
    'user',           -- default role
    'no_plan',        -- plan activated after payment
    'inactive',
    '{}',             -- empty access array
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;  -- Prevent duplicates if profile already exists

  RETURN NEW;
END;
$$;

-- 2. Trigger: fire after every new auth.users row
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
