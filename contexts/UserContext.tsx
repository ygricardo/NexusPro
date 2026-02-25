import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserPlan, UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';
import { authApi } from '../lib/api';

interface UserContextType {
    user: User | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    checkAccess: (allowedPlans: UserPlan[], adminOnly?: boolean, requiredModule?: string) => boolean;
    hasModule: (moduleId: string) => boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signUp: (email: string, password: string, fullName: string, role?: string, plan?: string) => Promise<{ error: any }>;
    signInWithGoogle: () => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session using JWT
        const initSession = async () => {
            console.log('UserContext: Checking initial JWT session...');
            const token = localStorage.getItem('nexus_token');

            if (token) {
                try {
                    const response = await authApi.getProfile();
                    if (response.ok) {
                        const contentType = response.headers.get('content-type');
                        if (contentType && contentType.includes('application/json')) {
                            const { user: profileData } = await response.json();
                            console.log('UserContext: Found valid session', profileData.id);
                            setUser({
                                id: profileData.sub || profileData.id,
                                name: profileData.name || 'User',
                                email: profileData.email,
                                role: profileData.role,
                                plan: normalizePlan(profileData.plan || 'no_plan'),
                                status: 'Active',
                                avatar: `https://ui-avatars.com/api/?name=${profileData.name || 'User'}`,
                                access: profileData.access || profileData.permissions || [],
                            });
                        } else {
                            localStorage.removeItem('nexus_token');
                        }
                    }
                } catch (error) {
                    console.error('UserContext: Session init failed', error);
                }
            }
            setLoading(false);
        };
        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('UserContext: Auth state change:', event);
            if (session) {
                // Fetch profile initially if supabase session exists
                await fetchProfile(session.user.id, session.user.email);
            } else {
                // Only clear user if NO custom token exists (avoid conflict with custom auth)
                const token = localStorage.getItem('nexus_token');
                if (!token) {
                    setUser(null);
                    setLoading(false);
                }
            }
        });

        if (!user?.id) return;

        // Realtime Subscription for Profile Updates
        console.log(`UserContext: Subscribing to profile changes for ${user.id}`);
        const channel = supabase
            .channel(`public:profiles:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('UserContext: Realtime update payload:', payload);
                    // The filter guarantees it's for this user, but double check doesn't hurt
                    if (payload.new && payload.new.id === user.id) {
                        console.log('UserContext: Match confirmed. Refreshing profile...');
                        fetchProfile(user.id, user.email);
                    }
                }
            )
            .subscribe();

        return () => {
            console.log('UserContext: Unsubscribing from realtime changes');
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    const normalizePlan = (rawPlan: string): UserPlan => {
        const lower = rawPlan?.toLowerCase() || '';
        if (lower === 'elite') return 'elite';
        if (lower === 'advanced') return 'advanced';
        if (lower === 'basic') return 'basic';
        return 'no_plan';
    };

    const fetchProfile = async (userId: string, email?: string, retryCount = 0) => {
        console.log(`UserContext: Fetching profile for ${userId} (Attempt ${retryCount + 1})`);

        try {
            // Use API instead of direct DB access to ensure consistent permissions/role mapping
            const response = await authApi.getProfile();
            if (!response.ok) {
                throw new Error(`Profile API returned ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Invalid content type: ${contentType}. Body: ${text.substring(0, 100)}`);
            }

            const { user: profileData } = await response.json();

            console.log('UserContext: Setting user state from API');
            setUser({
                id: profileData.id,
                name: profileData.name || 'User',
                email: profileData.email,
                role: profileData.role,
                plan: normalizePlan(profileData.plan || 'no_plan'),
                status: 'Active',
                avatar: `https://ui-avatars.com/api/?name=${profileData.name || 'User'}`,
                access: profileData.access || profileData.permissions || [],
            });
            setLoading(false);

        } catch (error) {
            console.error(`UserContext: Error fetching profile (Attempt ${retryCount + 1}):`, error);

            // Retry logic (max 3 retries)
            if (retryCount < 3) {
                console.log(`UserContext: Retrying in ${1000 * (retryCount + 1)}ms...`);
                setTimeout(() => fetchProfile(userId, email, retryCount + 1), 1000 * (retryCount + 1));
                return;
            }

            console.error('UserContext: All retries failed. Staying logged in with stale data for resilience.');
            // signOut(); // DISABLED: Do not kill session on background refresh failure
        }
    };

    const signIn = async (email: string, password: string) => {
        console.log('UserContext: Attempting signIn for', email);

        try {
            const response = await authApi.login({ email, password });

            const contentType = response.headers.get('content-type');
            let data: any = {};

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                data = { message: text || 'Empty response from server' };
            }

            if (!response.ok) {
                return { error: { message: data.error || data.message || `Server error: ${response.status}` } };
            }

            localStorage.setItem('nexus_token', data.token);

            const profileData = data.user;
            setUser({
                id: profileData.id,
                name: profileData.name,
                email: profileData.email,
                role: profileData.role,
                plan: normalizePlan(profileData.plan || 'basic'),
                status: 'Active',
                avatar: `https://ui-avatars.com/api/?name=${profileData.name}`,
                access: profileData.access || profileData.permissions || [],
            });

            return { error: null };
        } catch (err: any) {
            console.error('UserContext: Unexpected error during signIn', err);
            return { error: err };
        }
    };

    const signUp = async (email: string, password: string, fullName: string, role: string = 'user', plan: string = 'basic') => {
        try {
            const response = await authApi.register({ email, password, name: fullName, role, plan });
            const data = await response.json();

            if (!response.ok) {
                return { error: data };
            }

            return { error: null };
        } catch (err: any) {
            console.error('UserContext: Unexpected error during signUp', err);
            return { error: err };
        }
    };

    const signInWithGoogle = async (): Promise<{ error: any }> => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/#/auth/callback`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });
            return { error };
        } catch (err: any) {
            return { error: err };
        }
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Error signing out from Supabase:', error);
        }
        localStorage.removeItem('nexus_token');
        // Clear generator session data
        sessionStorage.removeItem('rbt_session_state');
        sessionStorage.removeItem('bcba_session_state');
        setUser(null);
    };

    const refreshUser = async () => {
        if (user) {
            await fetchProfile(user.id, user.email);
        }
    };

    const checkAccess = (allowedPlans: UserPlan[], adminOnly: boolean = false, requiredModule?: string): boolean => {
        if (!user) return false;

        // Cast to string to prevent "no overlap" error if inferred type is narrowed
        const role = user.role as string;
        if (role === 'admin') {
            // console.log('[CheckAccess] Granted: User is Admin');
            return true;
        }
        if (adminOnly && role !== 'admin') return false;

        // --- SPECIAL PERMISSION LOGIC ---
        // 0. Explicit Module Grant Override
        if (requiredModule && user.access?.includes(requiredModule)) {
            console.log(`[CheckAccess] Module ${requiredModule} granted via override to ${user.email}`);
            return true;
        }

        const plan = user.plan;

        // --- PLAN BASED PERMISSION LOGIC (STRICT ENFORCEMENT) ---

        // 1. ELITE: Access to everything (Clinical Notes, Weekly, Daily)
        if (plan === 'elite') {
            return true;
        }

        // 2. ADVANCED: Access to Daily (rbt) and Weekly (bcba). NO Clinical Notes.
        if (plan === 'advanced') {
            if (requiredModule === 'note_generator' || requiredModule === 'session_note') return false;
            if (requiredModule === 'rbt_generator' || requiredModule === 'bcba_generator') return true;
            // Default to allowed for basic dashboard access if no specific clinical module requested
            return !adminOnly;
        }

        // 3. BASIC: Access to Daily (rbt) only. NO Weekly, NO Clinical Notes.
        if (plan === 'basic') {
            if (requiredModule === 'note_generator' || requiredModule === 'session_note') return false;
            if (requiredModule === 'bcba_generator') return false;
            if (requiredModule === 'rbt_generator') return true;
            // Default to allowed for basic dashboard access if no specific clinical module requested
            return !adminOnly;
        }

        // 4. NO_PLAN: No clinical access at all.
        if (plan === 'no_plan') {
            if (requiredModule) return false;
            // If no required module, allow general dashboard/profile access
            return !adminOnly;
        }

        // Final Plan Check (Fallback)
        return allowedPlans.includes(user.plan);
    };

    const isTrialValid = (createdAt: string | undefined, days: number): boolean => {
        if (!createdAt) return true; // Fail safe: give access if date missing
        const created = new Date(createdAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - created.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= days;
    };

    const hasModule = (moduleId: string): boolean => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        return user.access?.includes(moduleId) || false;
    };

    return (
        <UserContext.Provider value={{ user, setUser, checkAccess, hasModule, loading, signIn, signUp, signInWithGoogle, signOut, refreshUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};