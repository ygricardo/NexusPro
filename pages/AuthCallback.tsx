import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { authApi } from '../lib/api';
import { motion } from 'framer-motion';

/**
 * AuthCallback handles the redirect from Google OAuth.
 * Supabase sets the session from the URL hash automatically.
 * We must then sync that session with our backend to obtain a `nexus_token`
 * before redirecting to the dashboard.
 */
const AuthCallback = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('Waiting for Supabase session...');

    useEffect(() => {
        const syncWithBackend = async (session: any) => {
            try {
                setStatus('Syncing session with backend...');
                console.log('AuthCallback: Syncing session with backend...');
                const response = await authApi.syncSession(session.access_token);

                if (response.ok) {
                    const data = await response.json();
                    if (data.token) {
                        setStatus('Success! Redirecting...');
                        console.log('AuthCallback: Session synced successfully.');
                        localStorage.setItem('nexus_token', data.token);
                        // Redirect to dashboard. UserContext will detect the token and load profile.
                        navigate('/', { replace: true });
                    } else {
                        throw new Error('No token received from sync');
                    }
                } else {
                    const errText = await response.text();
                    throw new Error(`Sync failed with status: ${response.status}. ${errText}`);
                }
            } catch (error: any) {
                setStatus(`Error: ${error.message}. Redirecting to login...`);
                console.error('AuthCallback: Error syncing session:', error);
                // If sync fails, we can't let them in properly. Send back to login.
                await supabase.auth.signOut();
                localStorage.removeItem('nexus_token');
                setTimeout(() => navigate('/login', { replace: true }), 3000);
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setStatus(`Auth event: ${event}`);
            if (event === 'SIGNED_IN' && session) {
                syncWithBackend(session);
            } else if (event === 'SIGNED_OUT') {
                navigate('/login', { replace: true });
            }
        });

        // Fallback: if already signed in (session was set before this mounted)
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                setStatus(`GetSession error: ${error.message}`);
            } else if (session) {
                setStatus('Session found during mount. Syncing...');
                syncWithBackend(session);
            } else {
                setStatus('No session found yet. Waiting for Auth Event...');
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-midnight font-display">
            <div className="flex flex-col items-center gap-8">
                {/* Animated logo */}
                <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-primary to-cyan-400 text-white shadow-lg shadow-primary/30"
                >
                    <span className="material-symbols-outlined text-[36px]">hub</span>
                </motion.div>

                {/* Spinner */}
                <div className="flex flex-col items-center gap-3">
                    <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="material-symbols-outlined text-[32px] text-primary"
                    >
                        progress_activity
                    </motion.span>
                    <p className="text-white/60 font-medium text-sm tracking-wide">
                        Authenticating with Google…
                    </p>
                    <p className="text-blue-400 font-mono text-xs mt-4 p-2 bg-black/20 rounded">
                        Debug Status: {status}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthCallback;
