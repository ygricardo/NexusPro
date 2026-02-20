CREATE TABLE IF NOT EXISTS public.generation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    client_id UUID REFERENCES public.clients(id),
    module_type TEXT NOT NULL CHECK (module_type IN ('RBT', 'BCBA')),
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies
ALTER TABLE public.generation_history ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert their own history
DROP POLICY IF EXISTS "Users can create their own history" ON public.generation_history;
CREATE POLICY "Users can create their own history"
ON public.generation_history FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to view their own history
DROP POLICY IF EXISTS "Users can view their own history" ON public.generation_history;
CREATE POLICY "Users can view their own history"
ON public.generation_history FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy to allow users to delete their own history
DROP POLICY IF EXISTS "Users can delete their own history" ON public.generation_history;
CREATE POLICY "Users can delete their own history"
ON public.generation_history FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
