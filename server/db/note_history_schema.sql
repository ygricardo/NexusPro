CREATE TABLE IF NOT EXISTS public.notes_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    case_tag TEXT,
    content TEXT NOT NULL,
    quantitative_summary JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies
ALTER TABLE public.notes_history ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert their own notes
DROP POLICY IF EXISTS "Users can create their own notes" ON public.notes_history;
CREATE POLICY "Users can create their own notes"
ON public.notes_history FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to view their own notes
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes_history;
CREATE POLICY "Users can view their own notes"
ON public.notes_history FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy to allow users to delete their own notes
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes_history;
CREATE POLICY "Users can delete their own notes"
ON public.notes_history FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
