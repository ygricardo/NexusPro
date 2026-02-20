
-- 1. Create Daily Records Table (RBT Data)
CREATE TABLE IF NOT EXISTS public.daily_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    behavior_name TEXT NOT NULL,
    data_json JSONB NOT NULL,
    total INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Weekly Records Table (BCBA Data)
CREATE TABLE IF NOT EXISTS public.weekly_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    behavior_name TEXT NOT NULL,
    data_json JSONB NOT NULL,
    baseline INTEGER,
    trend TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_records ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Drop existing to avoid conflicts if re-running)
DROP POLICY IF EXISTS "Users can view their own daily records" ON public.daily_records;
CREATE POLICY "Users can view their own daily records" ON public.daily_records
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own daily records" ON public.daily_records;
CREATE POLICY "Users can insert their own daily records" ON public.daily_records
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own weekly records" ON public.weekly_records;
CREATE POLICY "Users can view their own weekly records" ON public.weekly_records
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own weekly records" ON public.weekly_records;
CREATE POLICY "Users can insert their own weekly records" ON public.weekly_records
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Ensure Note History Exists (Idempotent)
CREATE TABLE IF NOT EXISTS public.notes_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    client_id UUID REFERENCES public.clients(id), -- Add client_id linkage if missing
    case_tag TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add client_id column to notes_history if it doesn't exist (Migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notes_history' AND column_name='client_id') THEN
        ALTER TABLE public.notes_history ADD COLUMN client_id UUID REFERENCES public.clients(id);
    END IF;
END $$;
