-- NEXUSPRO SECURITY HARDENING SCRIPT
-- FOCUS: Profiles, Clients, Clinical Data, and Admin Oversight

-- 1. CLEANUP PROFILES
-- Remove risky policies
DROP POLICY IF EXISTS "DEBUG_OPEN_ACCESS" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
ON profiles FOR SELECT 
TO authenticated 
USING (is_admin());

-- 2. HARDEN IS_ADMIN FUNCTION
-- Ensure it checks both column possibilities for robustness during transition
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR role_id = 'admin')
  );
END;
$function$;

-- 3. ADMIN OVERRIDE FOR CLINICAL DATA
-- Allow admins to oversee all patient data
CREATE POLICY "Admins can view all clients" ON clients FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can view all daily records" ON daily_records FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can view all weekly records" ON weekly_records FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can view all generated notes" ON generated_notes FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can view all notes history" ON notes_history FOR SELECT TO authenticated USING (is_admin());

-- 4. RBAC PROTECTION
-- Ensure only admins can modify roles and permissions
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON permissions;
CREATE POLICY "Authenticated users can view permissions" ON permissions FOR SELECT TO authenticated USING (true);
-- No insert/update/delete for non-admins (implicit by RLS being enabled and no other policies)

DROP POLICY IF EXISTS "Authenticated users can view roles" ON roles;
CREATE POLICY "Authenticated users can view roles" ON roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view role_permissions" ON role_permissions;
CREATE POLICY "Authenticated users can view role_permissions" ON role_permissions FOR SELECT TO authenticated USING (true);
