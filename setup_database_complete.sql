-- 1. Ensure Columns Exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS access text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS plan text DEFAULT 'basic';

-- 2. Enable Realtime Replication (CRITICAL for instant updates)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- 3. Security & Permissions (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Improved Admin Check to avoid infinite recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- We use a direct query with security definer to bypass RLS for this specific check
  -- This prevents the "Infinite recursion" error when an RLS policy calls a function 
  -- that queries the same table protected by the policy.
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old policies to allow clean slate
DROP POLICY IF EXISTS "Admins can do everything" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Admin Policy: Full CRUD Access
CREATE POLICY "Admins can do everything"
ON profiles
FOR ALL
USING ( is_admin() );

-- User Policy: View Own Profile
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
USING ( auth.uid() = id );

-- User Policy: Update Own Profile (Restricted usually, but allowing basic)
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
USING ( auth.uid() = id );

-- 4. EMERGENCY: Make sure YOU are an admin.
-- Replace 'admin@nexuspro.com' with your actual login email to force yourself as admin
-- UPDATE profiles SET role = 'admin' WHERE email = 'your_email@example.com';
