-- RBAC Schema Migration
-- 1. Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
    name TEXT PRIMARY KEY,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Permissions Table
CREATE TABLE IF NOT EXISTS public.permissions (
    name TEXT PRIMARY KEY,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Role-Permissions Join Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_name TEXT REFERENCES public.roles(name) ON DELETE CASCADE,
    permission_name TEXT REFERENCES public.permissions(name) ON DELETE CASCADE,
    PRIMARY KEY (role_name, permission_name)
);

-- 4. Initial Seed Data
INSERT INTO public.roles (name, description) VALUES
('admin', 'Super administrator with full access'),
('editor', 'Can edit content and manage clients'),
('premium', 'Standard user with premium features'),
('user', 'Basic registered user')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.permissions (name, description) VALUES
('all:all', 'Full administrative access'),
('read:clients', 'View client list and details'),
('write:clients', 'Create and edit client data'),
('read:reports', 'View analytics and reports'),
('manage:users', 'Change user roles and permissions')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role_name, permission_name) VALUES
('admin', 'all:all'),
('admin', 'manage:users'),
('editor', 'read:clients'),
('editor', 'write:clients'),
('editor', 'read:reports'),
('premium', 'read:clients'),
('premium', 'read:reports'),
('user', 'read:clients')
ON CONFLICT DO NOTHING;

-- 5. Link Profiles to Roles
-- Assuming 'profiles' table already exists as per setup_database_complete.sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role_id TEXT REFERENCES public.roles(name) DEFAULT 'user';

-- Set existing admins if any
-- UPDATE public.profiles SET role_id = 'admin' WHERE role = 'admin';

-- 6. Enable RLS on new tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Allow read access to roles/permissions for authenticated users
CREATE POLICY "Authenticated users can view roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
