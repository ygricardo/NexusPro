-- Create daily_records table
CREATE TABLE IF NOT EXISTS public.daily_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    behavior_name TEXT NOT NULL,
    data_json JSONB NOT NULL,
    total INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create weekly_records table
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

-- Enable RLS
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_records ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view their own daily records" ON public.daily_records
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily records" ON public.daily_records
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily records" ON public.daily_records
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily records" ON public.daily_records
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own weekly records" ON public.weekly_records
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly records" ON public.weekly_records
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly records" ON public.weekly_records
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly records" ON public.weekly_records
    FOR DELETE USING (auth.uid() = user_id);
