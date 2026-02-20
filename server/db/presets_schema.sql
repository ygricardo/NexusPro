CREATE TABLE IF NOT EXISTS public.presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies
ALTER TABLE public.presets ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert their own credentials
DROP POLICY IF EXISTS "Users can create their own presets" ON public.presets;
CREATE POLICY "Users can create their own presets"
ON public.presets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to view their own credentials
DROP POLICY IF EXISTS "Users can view their own presets" ON public.presets;
CREATE POLICY "Users can view their own presets"
ON public.presets FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy to allow users to delete their own credentials
DROP POLICY IF EXISTS "Users can delete their own presets" ON public.presets;
CREATE POLICY "Users can delete their own presets"
ON public.presets FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
