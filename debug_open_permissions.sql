-- DEBUG MODE: OPEN PERMISSIONS
-- Use this ONLY to verify if RLS is the blocker.
-- If updates work after running this, the previous logic had a bug.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Allow ANY logged-in user to View/Edit ALL profiles
CREATE POLICY "DEBUG_OPEN_ACCESS"
ON profiles
FOR ALL
USING ( auth.role() = 'authenticated' );

-- Verify column 'access' exists just in case
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS access text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan text DEFAULT 'rbt_starter';

-- Ensure Realtime is ON (Commented out because it is already on)
-- ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
