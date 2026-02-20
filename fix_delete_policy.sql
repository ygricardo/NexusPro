-- Fix: Enable delete permissions for generated_notes
-- Run this in your Supabase SQL Editor

BEGIN;

-- Ensure RLS is enabled
ALTER TABLE generated_notes ENABLE ROW LEVEL SECURITY;

-- Drop policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Users can delete their own generated notes" ON generated_notes;

-- Create the delete policy
CREATE POLICY "Users can delete their own generated notes"
ON generated_notes
FOR DELETE
USING (auth.uid() = user_id);

COMMIT;
