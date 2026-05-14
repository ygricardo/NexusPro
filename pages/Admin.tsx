import React, { useState, useMemo, useEffect } from 'react';
import Layout from '../components/Layout';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabaseClient';
import { authApi } from '../lib/api';
import { UserPlan, Plan } from '../types';
import { useConfirm } from '../contexts/ConfirmContext';
import { useToast } from '../contexts/ToastContext';

// Define available modules for the system
const SYSTEM_MODULES = [
    { id: 'note_generator', label: 'Note Generator' },
    { id: 'bcba_generator', label: 'Weekly Number Generator' },
    { id: 'rbt_generator', label: 'Daily Number Generator' },
];

const NO_PLAN_SLUG = 'no_plan';

interface AdminUserType {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
    status: 'Active' | 'Offline' | 'Inactive';
    avatar_color: string;
    access: string[]; // Array of module IDs
    plan: UserPlan;
}

const DEFAULT_USER: AdminUserType = {
    id: '',
    name: '',
    email: '',
    role: 'user',
    status: 'Active',
    avatar_color: 'bg-neutral-200 dark:bg-neutral-700',
    access: [],
    plan: NO_PLAN_SLUG
};

export const AdminUsers = () => {
    const { t } = useLanguage();
    const { user } = useUser();
    const { confirm, showAlert } = useConfirm();
    const toast = useToast();

    // State
    const [users, setUsers] = useState<AdminUserType[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<AdminUserType | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [result_snapshot, setResultSnapshot] = useState<any>(null);
    const [plans, setPlans] = useState<Plan[]>([]);

    // Fetch users from Supabase and subscribe to changes
    useEffect(() => {
        fetchUsers();
        fetchPlans();

        const channel = supabase
            .channel('admin_users_list')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                },
                (payload) => {
                    console.log('[Admin Users] Realtime update detected:', payload);
                    fetchUsers();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await authApi.getAllPlansAdmin();
            if (!res.ok) return;
            const json = await res.json();
            if (json?.success && Array.isArray(json.data)) {
                setPlans(json.data);
            }
        } catch (err) {
            console.error('[Admin Users] Failed to fetch plans:', err);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await authApi.getUsers();
            if (!response.ok) {
                const status = response.status;
                const text = await response.text();
                console.error(`[Admin] API error status ${status}:`, text);
                toast.error(`Error ${status}: Failed to reach server`);
                setLoading(false);
                return;
            }

            const contentType = response.headers.get('content-type');
            let result: any = {};

            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                const text = await response.text();
                result = { success: false, message: text || 'Empty response from server' };
            }

            setResultSnapshot(result);

            let usersList = [];
            if (Array.isArray(result)) {
                usersList = result;
            } else if (result.success && Array.isArray(result.data)) {
                usersList = result.data;
            }

            if (usersList.length > 0 || Array.isArray(result) || (result.success && result.data)) {
                console.log('[Admin] Received users data:', usersList.length, 'items');
                // Map Supabase profiles to AdminUserType
                const mappedUsers: AdminUserType[] = usersList.map((profile: any) => ({
                    id: profile.id,
                    name: profile.full_name || 'Unknown',
                    email: profile.email || 'No Email',
                    role: (profile.role_id?.toLowerCase() === 'admin' ? 'admin' : 'user'), // Use role_id
                    status: (profile.status as 'Active' | 'Offline' | 'Inactive') || 'Active',
                    avatar_color: 'bg-neutral-200 dark:bg-neutral-700',
                    access: profile.access || [],
                    plan: (profile.plan?.trim().toLowerCase() as UserPlan) || 'no_plan'
                }));
                setUsers(mappedUsers);
            } else {
                console.error('Error fetching users:', result.message || 'No data array found');
                toast.error('Failed to fetch users: ' + (result.message || 'Data format error'));
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Network error while fetching users');
        }
        setLoading(false);
    };

    // Filter users based on search term
    const filteredUsers = useMemo(() => {
        return users.filter(user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const handleCreateClick = () => {
        setEditingUser({
            ...DEFAULT_USER,
            id: '', // Empty ID tells us it's a new user (though creating auth users from client is limited)
            avatar_color: 'bg-neutral-200 dark:bg-neutral-700'
        });
    };

    const handleEditClick = (user: AdminUserType) => {
        setEditingUser({ ...user });
    };

    const handleDeleteClick = async (userToDelete: AdminUserType) => {
        let confirmConfig = {
            title: t('delete_confirm_title') || 'Delete User',
            message: t('delete_confirm'),
            type: 'danger' as const,
            confirmText: 'Delete'
        };

        if (userToDelete.role === 'admin') {
            confirmConfig = {
                title: '🚨 CRITICAL WARNING: DELETING ADMIN',
                message: `You are about to permanently delete a SYSTEM ADMINISTRATOR (${userToDelete.email}). This can lock you out of the system forever. Are you absolutely certain?`,
                type: 'danger' as const,
                confirmText: 'YES, DELETE ADMIN FOREVER'
            };
        }

        const isConfirmed = await confirm(confirmConfig);

        if (isConfirmed) {
            try {
                const response = await authApi.deleteUser(userToDelete.id);
                // Check if response is ok, sometimes it returns 200 with result
                if (response.ok) {
                    setUsers(users.filter(u => u.id !== userToDelete.id));
                    await showAlert('Success', 'User deleted successfully.', 'success');
                } else {
                    const err = await response.json();
                    await showAlert('Error', `Failed to delete: ${err.message}`, 'danger');
                }
            } catch (error: any) {
                console.error('Error deleting user:', error);
                await showAlert('Error', `Network/Server Error: ${error.message}`, 'danger');
            }
        }
    };

    // Helper to update backend immediately
    const updateUserRemote = async (userData: AdminUserType) => {
        if (!userData.id) return; // Can't update new user remotely before creation

        const profileData = {
            full_name: userData.name,
            role: userData.role,
            plan: userData.plan,
            status: userData.status,
            access: userData.access
        };

        try {
            console.log('[Admin] Instant Save:', profileData);
            const response = await authApi.updateUser(userData.id, profileData);

            const contentType = response.headers.get('content-type');
            let result: any = {};
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                const text = await response.text();
                result = { success: false, message: text || 'Empty response from server' };
            }

            if (!response.ok || !result.success) {
                await showAlert('Error', `Failed to save: ${result.message}`, 'danger');
            } else {
                await showAlert('Success', 'Profile updated successfully!', 'success');
            }
        } catch (err: any) {
            console.error('Error auto-saving user:', err);
            await showAlert('Error', `Network Error: ${err.message}`, 'danger');
        }
    };

    const handleToggleModule = (moduleId: string) => {
        if (!editingUser) return;

        const hasModule = editingUser.access.includes(moduleId);
        let newAccess;

        if (hasModule) {
            newAccess = editingUser.access.filter(id => id !== moduleId);
        } else {
            newAccess = [...editingUser.access, moduleId];
        }

        const updatedUser = { ...editingUser, access: newAccess };
        setEditingUser(updatedUser);
        // Instant save removed per user request - waits for "Save Changes"
    };

    const handleInputChange = (field: keyof AdminUserType, value: string) => {
        if (!editingUser) return;

        let updates: Partial<AdminUserType> = { [field]: value };

        // Auto-sync module access from the selected plan's modules array.
        if (field === 'plan') {
            if (value === NO_PLAN_SLUG) {
                updates.access = [];
            } else {
                const selectedPlan = plans.find(p => p.slug === value);
                updates.access = selectedPlan ? [...(selectedPlan.modules || [])] : [];
            }
        }

        setEditingUser({ ...editingUser, ...updates });
    };

    const handleSave = async () => {
        if (!editingUser) return;

        // Use the helper to send data
        await updateUserRemote(editingUser);

        // Refresh list to show latest state
        await fetchUsers();

        // Close modal
        setEditingUser(null);
    };

    // Only active plans can be assigned to new edits. Inactive plans show up
    // in the row badge of users who already have them, but not in the picker.
    const assignablePlanSlugs: string[] = useMemo(
        () => plans.filter(p => p.is_active).map(p => p.slug),
        [plans]
    );

    const planLabelBySlug = useMemo(() => {
        const map: Record<string, string> = { [NO_PLAN_SLUG]: 'No Plan' };
        plans.forEach(p => { map[p.slug] = p.name; });
        return map;
    }, [plans]);

    const headerContent = (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">Users</h1>
                <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold uppercase rounded border border-red-200 dark:border-red-800">
                    {t('admin_only')}
                </span>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">{t('user_management_desc')}</p>
        </div>
    );

    return (
        <Layout>
            {/* Search and Action Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                <div className="relative w-full md:w-96">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">search</span>
                    <input
                        type="text"
                        placeholder={t('search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
                    />
                </div>
                <button
                    onClick={handleCreateClick}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-md shadow-primary/20 transition-all"
                >
                    <span className="material-symbols-outlined">person_add</span>
                    {t('add_user')}
                </button>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-neutral-50 dark:bg-background-dark/50 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10">
                        <tr>
                            <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">User</th>
                            <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{t('role')}</th>
                            <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{t('membership')}</th>
                            <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{t('status')}</th>
                            <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{t('module_access')}</th>
                            <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                                <tr key={user.id} className={`transition-colors ${user.role === 'admin' ? 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20' : 'hover:bg-neutral-50 dark:hover:bg-white/5'}`}>
                                    <td className="py-4 px-6 flex items-center gap-3">
                                        <div className={`size-8 rounded-full flex items-center justify-center ${user.role === 'admin' ? 'bg-red-100 dark:bg-red-900/30' : user.avatar_color}`}>
                                            {user.role === 'admin' && <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-sm">security</span>}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className={`font-medium ${user.role === 'admin' ? 'text-red-600 dark:text-red-400 font-bold' : 'text-neutral-900 dark:text-white'}`}>{user.name}</p>
                                                {user.role === 'admin' && <span className="material-symbols-outlined text-[14px] text-red-500 animate-pulse" title="System Administrator">warning</span>}
                                            </div>
                                            <p className="text-xs text-neutral-500">{user.email}</p>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${user.role === 'admin'
                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${user.plan === NO_PLAN_SLUG || !user.plan
                                            ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                                            : 'bg-primary/10 text-primary border-primary/20'
                                            }`}>
                                            {planLabelBySlug[user.plan] || user.plan || 'No Plan'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`text-sm font-medium ${user.status === 'Active' ? 'text-secondary' : 'text-neutral-500'
                                            }`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-1 flex-wrap max-w-[200px]">
                                            {user.access.length > 0 ? (
                                                user.access.map(moduleId => (
                                                    <span key={moduleId} className="inline-block size-2 rounded-full bg-primary" title={SYSTEM_MODULES.find(m => m.id === moduleId)?.label}></span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-neutral-400 italic">None</span>
                                            )}
                                            <span className="text-xs text-neutral-500 ml-1">({user.access.length})</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEditClick(user)}
                                                className="size-8 flex items-center justify-center rounded text-neutral-500 hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                                title={t('manage_permissions')}
                                            >
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(user)}
                                                className={`size-8 flex items-center justify-center rounded transition-colors ${user.role === 'admin' ? 'text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40' : 'text-neutral-500 hover:text-red-600 hover:bg-white dark:hover:bg-neutral-800'}`}
                                                title={user.role === 'admin' ? "DANGER: Delete Admin" : "Delete User"}
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-neutral-500 dark:text-neutral-400">
                                    No users found matching "{searchTerm}"
                                    {!loading && users.length === 0 && (
                                        <div className="mt-2 text-xs opacity-50">
                                            Debug: API returned {JSON.stringify(result_snapshot || 'no-data')}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Permissions & Edit Modal */}
            {
                editingUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
                                <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                                    {users.some(u => u.id === editingUser.id) ? t('manage_permissions') : t('create_user')}
                                </h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('user_details')}</p>
                            </div>

                            <div className="p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                                {/* Basic Info Form */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1 uppercase">{t('name_label')}</label>
                                        <input
                                            type="text"
                                            value={editingUser.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            className="w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1 uppercase">{t('email_label')}</label>
                                        <input
                                            type="email"
                                            value={editingUser.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            className="w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1 uppercase">{t('role_label')}</label>
                                        <div className="relative">
                                            <select
                                                value={editingUser.role}
                                                onChange={(e) => handleInputChange('role', e.target.value as any)}
                                                className="w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer"
                                            >
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">expand_more</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1 uppercase">{t('status_label')}</label>
                                        <div className="relative">
                                            <select
                                                value={editingUser.status}
                                                onChange={(e) => handleInputChange('status', e.target.value as any)}
                                                className="w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer"
                                            >
                                                <option value="Active">Active</option>
                                                <option value="Inactive">Inactive</option>
                                                <option value="Offline">Offline</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">expand_more</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800">
                                    <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-3 uppercase flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">card_membership</span>
                                        {t('membership_plan')}
                                    </label>
                                    <div className="space-y-3">
                                        {/* No-plan option + all assignable (active) plans.
                                            If the user is currently on an inactive plan, surface it too so
                                            admins can still see/keep their current selection. */}
                                        {(() => {
                                            const slugs = [NO_PLAN_SLUG, ...assignablePlanSlugs];
                                            if (editingUser.plan && !slugs.includes(editingUser.plan)) {
                                                slugs.push(editingUser.plan);
                                            }
                                            return slugs.map((planType) => {
                                                const isActive = editingUser.plan === planType;
                                                const planRecord = plans.find(p => p.slug === planType);
                                                const isInactivePlan = planType !== NO_PLAN_SLUG && planRecord && !planRecord.is_active;

                                                return (
                                                    <div
                                                        key={planType}
                                                        onClick={() => handleInputChange('plan', planType)}
                                                        className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${isActive
                                                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                                            : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`size-8 rounded-full flex items-center justify-center ${isActive ? 'bg-primary text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>
                                                                <span className="material-symbols-outlined text-lg">
                                                                    {planType === NO_PLAN_SLUG ? 'block' : 'workspace_premium'}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className={`font-medium text-sm ${isActive ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>
                                                                    {planLabelBySlug[planType] || planType}
                                                                </span>
                                                                {isInactivePlan && <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">Inactive plan</span>}
                                                            </div>
                                                        </div>

                                                        <div className={`w-10 h-6 rounded-full relative transition-colors ${isActive ? 'bg-primary' : 'bg-neutral-300 dark:bg-neutral-600'}`}>
                                                            <div className={`absolute top-1 size-4 bg-white rounded-full transition-all shadow-sm ${isActive ? 'left-5' : 'left-1'}`}></div>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                    <p className="text-xs text-neutral-400 mt-2 text-center">{t('grant_plan')}</p>
                                </div>

                                <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
                                    <p className="text-xs font-bold uppercase text-neutral-400 tracking-wider mb-3">{t('modules')}</p>
                                    <div className="space-y-3">
                                        {SYSTEM_MODULES.map((module) => {
                                            const isEnabled = editingUser.access.includes(module.id);
                                            const isRestricted = false;

                                            return (
                                                <div
                                                    key={module.id}
                                                    // Removed !isRestricted check to allow Override
                                                    onClick={() => handleToggleModule(module.id)}
                                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${isEnabled
                                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                                        : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`size-8 rounded-full flex items-center justify-center ${isEnabled ? 'bg-primary text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>
                                                            <span className="material-symbols-outlined text-lg">extension</span>
                                                        </div>
                                                        <span className={`font-medium text-sm ${isEnabled ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>
                                                            {module.label}
                                                            {isRestricted && <span className="text-xs text-secondary ml-1 font-bold">(Role Warning)</span>}
                                                        </span>
                                                    </div>
                                                    <div className={`w-10 h-6 rounded-full relative transition-colors ${isEnabled ? 'bg-primary' : 'bg-neutral-300 dark:bg-neutral-600'}`}>
                                                        <div className={`absolute top-1 size-4 bg-white rounded-full transition-all shadow-sm ${isEnabled ? 'left-5' : 'left-1'}`}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-neutral-50 dark:bg-background-dark/50 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3 shrink-0">
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="px-4 py-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-bold text-sm transition-colors"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-red-700 font-bold text-sm shadow-md shadow-primary/20 transition-colors"
                                >
                                    {t('save_changes')}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </Layout >
    );
};

// ─── Plan Editor Modal ──────────────────────────────────────────────
interface PlanEditorState {
    id?: string;
    slug: string;
    name: string;
    description: string;
    price_dollars: string;
    currency: string;
    interval: 'month' | 'year';
    features: string[];
    modules: string[];
    color: string;
    is_active: boolean;
    display_order: number;
}

const emptyPlanEditor = (): PlanEditorState => ({
    slug: '',
    name: '',
    description: '',
    price_dollars: '0',
    currency: 'usd',
    interval: 'month',
    features: [],
    modules: [],
    color: 'primary',
    is_active: true,
    display_order: 0,
});

const planToEditor = (p: Plan): PlanEditorState => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description || '',
    price_dollars: (p.price_cents / 100).toFixed(2),
    currency: p.currency || 'usd',
    interval: (p.interval as 'month' | 'year') || 'month',
    features: Array.isArray(p.features) ? [...p.features] : [],
    modules: Array.isArray(p.modules) ? [...p.modules] : [],
    color: p.color || 'primary',
    is_active: p.is_active,
    display_order: p.display_order || 0,
});

export const AdminMembership = () => {
    const { confirm, showAlert } = useConfirm();
    const toast = useToast();

    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [editor, setEditor] = useState<PlanEditorState | null>(null);
    const [saving, setSaving] = useState(false);
    const [newFeature, setNewFeature] = useState('');

    const [stats, setStats] = useState({ revenue: 0, activeSubs: 0, loading: true });

    useEffect(() => {
        fetchPlans();
        calculateStats();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const res = await authApi.getAllPlansAdmin();
            const json = await res.json();
            if (json?.success && Array.isArray(json.data)) {
                setPlans(json.data);
            } else {
                toast.error('Failed to load plans');
            }
        } catch (err: any) {
            toast.error(`Failed to load plans: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Revenue is computed from DB plans × profile counts per slug.
    const calculateStats = async () => {
        try {
            const [plansRes, profilesRes] = await Promise.all([
                authApi.getAllPlansAdmin(),
                supabase.from('profiles').select('plan'),
            ]);

            const plansJson = await plansRes.json();
            const planList: Plan[] = plansJson?.success && Array.isArray(plansJson.data) ? plansJson.data : [];
            const profiles = profilesRes.data || [];

            const priceBySlug: Record<string, number> = {};
            planList.forEach(p => { priceBySlug[p.slug] = (p.price_cents || 0) / 100; });

            let revenue = 0;
            let subs = 0;
            profiles.forEach((profile: any) => {
                const slug = (profile.plan || '').toString().trim().toLowerCase();
                if (slug && slug !== NO_PLAN_SLUG && priceBySlug[slug] !== undefined) {
                    revenue += priceBySlug[slug];
                    subs++;
                }
            });
            setStats({ revenue, activeSubs: subs, loading: false });
        } catch (err) {
            console.error('[AdminMembership] stats failed:', err);
            setStats(s => ({ ...s, loading: false }));
        }
    };

    const openCreate = () => {
        setEditor({ ...emptyPlanEditor(), display_order: plans.length + 1 });
    };

    const openEdit = (plan: Plan) => {
        setEditor(planToEditor(plan));
    };

    const handleToggleModule = (moduleId: string) => {
        if (!editor) return;
        const hasIt = editor.modules.includes(moduleId);
        const modules = hasIt
            ? editor.modules.filter(m => m !== moduleId)
            : [...editor.modules, moduleId];
        setEditor({ ...editor, modules });
    };

    const handleAddFeature = () => {
        if (!editor || !newFeature.trim()) return;
        setEditor({ ...editor, features: [...editor.features, newFeature.trim()] });
        setNewFeature('');
    };

    const handleRemoveFeature = (idx: number) => {
        if (!editor) return;
        setEditor({ ...editor, features: editor.features.filter((_, i) => i !== idx) });
    };

    const handleSave = async () => {
        if (!editor) return;

        if (!editor.slug.trim() || !/^[a-z0-9_-]+$/.test(editor.slug)) {
            await showAlert('Invalid slug', 'Slug must be lowercase letters, digits, underscores or hyphens (e.g. "pro_yearly").', 'danger');
            return;
        }
        if (!editor.name.trim()) {
            await showAlert('Invalid name', 'Name is required.', 'danger');
            return;
        }
        const priceFloat = Number(editor.price_dollars);
        if (!Number.isFinite(priceFloat) || priceFloat < 0) {
            await showAlert('Invalid price', 'Price must be a non-negative number.', 'danger');
            return;
        }

        const payload = {
            slug: editor.slug.trim(),
            name: editor.name.trim(),
            description: editor.description.trim() || null,
            price_cents: Math.round(priceFloat * 100),
            currency: editor.currency,
            interval: editor.interval,
            features: editor.features,
            modules: editor.modules,
            color: editor.color,
            is_active: editor.is_active,
            display_order: editor.display_order,
        };

        setSaving(true);
        try {
            const res = editor.id
                ? await authApi.updatePlan(editor.id, payload)
                : await authApi.createPlan(payload);
            const json = await res.json();
            if (!res.ok || !json?.success) {
                throw new Error(json?.message || 'Save failed');
            }
            toast.success(editor.id ? 'Plan updated.' : 'Plan created.');
            setEditor(null);
            await fetchPlans();
            await calculateStats();
        } catch (err: any) {
            await showAlert('Save failed', err.message, 'danger');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (plan: Plan) => {
        try {
            const res = await authApi.togglePlan(plan.id, !plan.is_active);
            const json = await res.json();
            if (!res.ok || !json?.success) {
                throw new Error(json?.message || 'Toggle failed');
            }
            toast.success(`Plan "${plan.name}" ${!plan.is_active ? 'activated' : 'deactivated'}.`);
            await fetchPlans();
        } catch (err: any) {
            await showAlert('Toggle failed', err.message, 'danger');
        }
    };

    const handleDelete = async (plan: Plan) => {
        const ok = await confirm({
            title: `Delete plan "${plan.name}"?`,
            message: 'This permanently removes the plan. Users currently on this plan will block the delete — deactivate it instead if any user has it.',
            confirmText: 'Delete',
            type: 'danger',
        });
        if (!ok) return;

        try {
            const res = await authApi.deletePlan(plan.id);
            const json = await res.json();
            if (!res.ok || !json?.success) {
                throw new Error(json?.message || 'Delete failed');
            }
            toast.success(`Plan "${plan.name}" deleted.`);
            await fetchPlans();
            await calculateStats();
        } catch (err: any) {
            await showAlert('Delete failed', err.message, 'danger');
        }
    };

    return (
        <Layout>
            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-surface-dark">
                    <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Monthly Revenue (Est.)</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-2">
                        {stats.loading ? '...' : `$${stats.revenue.toFixed(2)}`}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">Based on active subscriptions</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-surface-dark">
                    <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Active Subscriptions</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-2">
                        {stats.loading ? '...' : stats.activeSubs}
                    </p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-surface-dark">
                    <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Total Plans</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-2">{plans.length}</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-surface-dark">
                    <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Active Plans</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-2">{plans.filter(p => p.is_active).length}</p>
                </div>
            </div>

            {/* Plan management table */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Membership Plans</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Activate, deactivate, edit, or create plans. Changes propagate across the system.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-primary hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-md shadow-primary/20 transition-all"
                >
                    <span className="material-symbols-outlined">add</span>
                    New Plan
                </button>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-neutral-50 dark:bg-background-dark/50 border-b border-neutral-200 dark:border-neutral-800">
                        <tr>
                            <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Order</th>
                            <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Plan</th>
                            <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Price</th>
                            <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Modules</th>
                            <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Status</th>
                            <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                        {loading ? (
                            <tr><td colSpan={6} className="py-12 text-center text-neutral-500">Loading...</td></tr>
                        ) : plans.length === 0 ? (
                            <tr><td colSpan={6} className="py-12 text-center text-neutral-500">No plans yet. Create your first plan.</td></tr>
                        ) : plans.map(plan => (
                            <tr key={plan.id} className="hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors">
                                <td className="py-4 px-6 text-neutral-500 dark:text-neutral-400 font-mono text-sm">{plan.display_order}</td>
                                <td className="py-4 px-6">
                                    <div className="flex flex-col">
                                        <p className="font-bold text-neutral-900 dark:text-white">{plan.name}</p>
                                        <p className="text-xs text-neutral-500 font-mono">{plan.slug}</p>
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <span className="font-bold text-neutral-900 dark:text-white">
                                        ${(plan.price_cents / 100).toFixed(2)}
                                    </span>
                                    <span className="text-xs text-neutral-500 ml-1">/{plan.interval}</span>
                                </td>
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-1 flex-wrap max-w-[240px]">
                                        {(plan.modules || []).length > 0 ? (
                                            (plan.modules || []).map(mid => (
                                                <span key={mid} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono">
                                                    {SYSTEM_MODULES.find(m => m.id === mid)?.label || mid}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-neutral-400 italic">None</span>
                                        )}
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <button
                                        onClick={() => handleToggleActive(plan)}
                                        className={`w-10 h-6 rounded-full relative transition-colors ${plan.is_active ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                                        title={plan.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                                    >
                                        <div className={`absolute top-1 size-4 bg-white rounded-full transition-all shadow-sm ${plan.is_active ? 'left-5' : 'left-1'}`}></div>
                                    </button>
                                    <p className={`text-[10px] uppercase tracking-wider font-bold mt-1 ${plan.is_active ? 'text-emerald-500' : 'text-neutral-500'}`}>
                                        {plan.is_active ? 'Active' : 'Inactive'}
                                    </p>
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => openEdit(plan)}
                                            className="size-8 flex items-center justify-center rounded text-neutral-500 hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                            title="Edit plan"
                                        >
                                            <span className="material-symbols-outlined text-lg">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(plan)}
                                            className="size-8 flex items-center justify-center rounded text-neutral-500 hover:text-red-600 hover:bg-white dark:hover:bg-neutral-800 transition-colors"
                                            title="Delete plan"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Plan editor modal */}
            {editor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
                            <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                                {editor.id ? 'Edit Plan' : 'Create Plan'}
                            </h2>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                Slug is the immutable identifier saved on user profiles. Choose carefully if creating.
                            </p>
                        </div>

                        <div className="p-6 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1 uppercase">Name</label>
                                    <input
                                        type="text"
                                        value={editor.name}
                                        onChange={e => setEditor({ ...editor, name: e.target.value })}
                                        className="w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="Pro Plan"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1 uppercase">
                                        Slug {editor.id && <span className="text-orange-500 normal-case">(changing breaks existing subscriptions)</span>}
                                    </label>
                                    <input
                                        type="text"
                                        value={editor.slug}
                                        onChange={e => setEditor({ ...editor, slug: e.target.value.toLowerCase() })}
                                        className="w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none font-mono"
                                        placeholder="pro_plan"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1 uppercase">Description</label>
                                    <input
                                        type="text"
                                        value={editor.description}
                                        onChange={e => setEditor({ ...editor, description: e.target.value })}
                                        className="w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="Short tagline shown to admins"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1 uppercase">Price (per {editor.interval})</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={editor.price_dollars}
                                            onChange={e => setEditor({ ...editor, price_dollars: e.target.value })}
                                            className="w-full h-10 pl-7 pr-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1 uppercase">Interval</label>
                                    <select
                                        value={editor.interval}
                                        onChange={e => setEditor({ ...editor, interval: e.target.value as 'month' | 'year' })}
                                        className="w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                                    >
                                        <option value="month">Monthly</option>
                                        <option value="year">Yearly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1 uppercase">Display Order</label>
                                    <input
                                        type="number"
                                        value={editor.display_order}
                                        onChange={e => setEditor({ ...editor, display_order: parseInt(e.target.value || '0', 10) })}
                                        className="w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1 uppercase">Color Hint</label>
                                    <select
                                        value={editor.color}
                                        onChange={e => setEditor({ ...editor, color: e.target.value })}
                                        className="w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                                    >
                                        <option value="neutral">Neutral</option>
                                        <option value="primary">Primary</option>
                                        <option value="secondary">Secondary</option>
                                    </select>
                                </div>
                            </div>

                            {/* Features */}
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-2 uppercase">Features (shown on /plans)</label>
                                <div className="space-y-2 mb-2">
                                    {editor.features.map((f, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                            <span className="material-symbols-outlined text-emerald-500 text-sm">check</span>
                                            <span className="flex-1 text-sm text-neutral-700 dark:text-neutral-200">{f}</span>
                                            <button onClick={() => handleRemoveFeature(i)} className="text-neutral-400 hover:text-red-500">
                                                <span className="material-symbols-outlined text-sm">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newFeature}
                                        onChange={e => setNewFeature(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFeature(); } }}
                                        placeholder="Add a feature line and press Enter"
                                        className="flex-1 h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                    />
                                    <button
                                        onClick={handleAddFeature}
                                        className="px-4 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600 font-bold text-sm"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            {/* Modules */}
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-2 uppercase">Modules unlocked by this plan</label>
                                <div className="space-y-2">
                                    {SYSTEM_MODULES.map(mod => {
                                        const enabled = editor.modules.includes(mod.id);
                                        return (
                                            <div
                                                key={mod.id}
                                                onClick={() => handleToggleModule(mod.id)}
                                                className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${enabled
                                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                                    : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`size-8 rounded-full flex items-center justify-center ${enabled ? 'bg-primary text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>
                                                        <span className="material-symbols-outlined text-lg">extension</span>
                                                    </div>
                                                    <span className={`font-medium text-sm ${enabled ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>
                                                        {mod.label}
                                                    </span>
                                                </div>
                                                <div className={`w-10 h-6 rounded-full relative transition-colors ${enabled ? 'bg-primary' : 'bg-neutral-300 dark:bg-neutral-600'}`}>
                                                    <div className={`absolute top-1 size-4 bg-white rounded-full transition-all shadow-sm ${enabled ? 'left-5' : 'left-1'}`}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                                <div>
                                    <p className="font-bold text-neutral-900 dark:text-white text-sm">Plan is Active</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Inactive plans are hidden from /plans and cannot be purchased.</p>
                                </div>
                                <button
                                    onClick={() => setEditor({ ...editor, is_active: !editor.is_active })}
                                    className={`w-12 h-7 rounded-full relative transition-colors ${editor.is_active ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                                >
                                    <div className={`absolute top-1 size-5 bg-white rounded-full transition-all shadow-sm ${editor.is_active ? 'left-6' : 'left-1'}`}></div>
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-neutral-50 dark:bg-background-dark/50 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setEditor(null)}
                                disabled={saving}
                                className="px-4 py-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-bold text-sm transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-red-700 font-bold text-sm shadow-md shadow-primary/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                                {editor.id ? 'Save Changes' : 'Create Plan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export const AdminLicenses = () => {
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        supabase.from('profiles').select('id', { count: 'exact', head: true })
            .then(({ count }) => setCount(count));
    }, []);

    const MAX_LICENSES = 50; // Hardcoded limit for now

    const headerContent = (
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">User & License Assignment</h1>
    );
    return (
        <Layout>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-xl shadow-sm">
                    <span className="text-neutral-500 dark:text-neutral-400 text-sm font-medium">Total Licenses Used</span>
                    <span className="text-3xl font-bold text-neutral-900 dark:text-white block mt-2">
                        {count !== null ? count : '...'} / {MAX_LICENSES}
                    </span>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 mt-3 overflow-hidden">
                        <div
                            className="bg-primary h-1.5 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(((count || 0) / MAX_LICENSES) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </Layout>
    )
};