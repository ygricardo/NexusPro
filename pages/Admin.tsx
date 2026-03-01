import React, { useState, useMemo, useEffect } from 'react';
import Layout from '../components/Layout';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabaseClient';
import { authApi } from '../lib/api';
import { UserPlan } from '../types';
import { useConfirm } from '../contexts/ConfirmContext';
import { useToast } from '../contexts/ToastContext';

// Define available modules for the system
const SYSTEM_MODULES = [
    { id: 'note_generator', label: 'Note Generator' },
    { id: 'bcba_generator', label: 'Weekly Number Generator' },
    { id: 'rbt_generator', label: 'Daily Number Generator' },
];

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
    plan: 'basic'
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

    // Fetch users from Supabase and subscribe to changes
    useEffect(() => {
        fetchUsers();

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
        const newState = { ...editingUser, ...updates };

        // Logic: Auto-Activate/Deactivate Modules based on Plan
        if (field === 'plan') {
            let newAccess = new Set(newState.access);

            if (value === 'basic') {
                newAccess.add('rbt_generator');
                newAccess.delete('bcba_generator');
                newAccess.delete('note_generator');
            } else if (value === 'advanced') {
                newAccess.add('rbt_generator');
                newAccess.add('bcba_generator');
                newAccess.delete('note_generator');
            } else if (value === 'elite') {
                newAccess.add('rbt_generator');
                newAccess.add('bcba_generator');
                newAccess.add('note_generator');
            } else if (value === 'no_plan') {
                newAccess.clear();
            }

            updates.access = Array.from(newAccess);
        }

        const finalUser = { ...editingUser, ...updates };
        setEditingUser(finalUser);
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

    const availablePlans: UserPlan[] = ['basic', 'advanced', 'elite'];

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
                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${user.plan === 'pro'
                                            ? 'bg-primary/10 text-primary border-primary/20'
                                            : user.plan === 'elite'
                                                ? 'bg-secondary/10 dark:bg-secondary/20 text-secondary border-secondary/20 dark:border-secondary/30'
                                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                                            }`}>
                                            {
                                                user.plan === 'basic' ? 'Basic' :
                                                    user.plan === 'advanced' ? 'Advanced' :
                                                        user.plan === 'elite' ? 'Elite' :
                                                            user.plan === 'no_plan' ? 'No Plan' : user.plan
                                            }
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
                                        {/* Add 'none' to available plans for Admin selection */}
                                        {['no_plan', ...availablePlans].map((planType) => {
                                            const isActive = editingUser.plan === planType;
                                            const isRestricted = false;

                                            return (
                                                <div
                                                    key={planType}
                                                    onClick={() => !isRestricted && handleInputChange('plan', planType)}
                                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${isActive
                                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                                        : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                                                        } ${isRestricted ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`size-8 rounded-full flex items-center justify-center ${isActive ? 'bg-primary text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>
                                                            <span className="material-symbols-outlined text-lg">
                                                                {planType === 'elite' ? 'verified' : planType === 'advanced' ? 'star' : planType === 'basic' ? 'account_circle' : 'block'}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className={`font-medium text-sm ${isActive ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>
                                                                {
                                                                    planType === 'basic' ? 'Basic' :
                                                                        planType === 'advanced' ? 'Advanced' :
                                                                            planType === 'elite' ? 'Elite' :
                                                                                planType === 'elite' ? 'Elite' :
                                                                                    planType === 'no_plan' ? 'No Plan' : planType
                                                                }
                                                            </span>
                                                            {isRestricted && <span className="text-[10px] text-neutral-400">Unavailable</span>}
                                                        </div>
                                                    </div>

                                                    {/* Toggle UI for selection */}
                                                    <div className={`w-10 h-6 rounded-full relative transition-colors ${isActive ? 'bg-primary' : 'bg-neutral-300 dark:bg-neutral-600'}`}>
                                                        <div className={`absolute top-1 size-4 bg-white rounded-full transition-all shadow-sm ${isActive ? 'left-5' : 'left-1'}`}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
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

export const AdminMembership = () => {
    const [stats, setStats] = useState({ revenue: 0, activeSubs: 0, loading: true });

    useEffect(() => {
        calculateStats();
    }, []);

    const calculateStats = async () => {
        const { data, error } = await supabase.from('profiles').select('plan');
        if (data) {
            let revenue = 0;
            let subs = 0;

            data.forEach((p: any) => {
                if (p.plan === 'basic') {
                    revenue += 19.99;
                    subs++;
                } else if (p.plan === 'advanced') {
                    revenue += 49.99;
                    subs++;
                } else if (p.plan === 'elite') {
                    revenue += 69.99;
                    subs++;
                }
            });

            setStats({ revenue, activeSubs: subs, loading: false });
        }
    };

    const headerContent = (
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">Membership Management</h1>
    );
    return (
        <Layout>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-surface-dark">
                    <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Monthly Revenue (Est.)</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-2">
                        {stats.loading ? '...' : `$${stats.revenue.toFixed(2)}`}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">Based on active plans</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-surface-dark">
                    <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Active Subscriptions</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-2">
                        {stats.loading ? '...' : stats.activeSubs}
                    </p>
                </div>
            </div>
        </Layout>
    )
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