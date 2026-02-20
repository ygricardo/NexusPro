-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Function to check if the current user is an admin (prevents recursion)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy: Admins can do ANYTHING on profiles
CREATE POLICY "Admins can do everything"
ON profiles
FOR ALL
USING ( is_admin() );

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
USING ( auth.uid() = id );

-- Policy: Users can update their own profile (optional, usually limited fields)
-- For now, let's allow them to update basic fields if you want, or keep it strict.
-- Keeping it strict: Users usually don't update their generic profile directly in this app, 
-- but if they do, add a specific policy.

-- Policy: Public read access for specific needs? 
-- Usually "Users can view own profile" is enough.
-- But if existing policies exist, we might want to drop them first to be clean.

-- DROP POLICY IF EXISTS "Admins can do everything" ON profiles;
-- DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
-- (Users should run this manually to be safe)
