import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'framer-motion';

/**
 * AuthCallback handles the redirect from Google OAuth.
 * Supabase sets the session from the URL hash automatically.
 * We simply wait for the session to initialize, then redirect to dashboard.
 */
const AuthCallback = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // onAuthStateChange in UserContext will handle profile loading.
        // We just poll for session completion and redirect.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                // Small delay to allow UserContext to set user state
                setTimeout(() => navigate('/', { replace: true }), 500);
            } else if (event === 'SIGNED_OUT') {
                navigate('/login', { replace: true });
            }
        });

        // Fallback: if already signed in (session was set before this mounted)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setTimeout(() => navigate('/', { replace: true }), 500);
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
                </div>
            </div>
        </div>
    );
};

export default AuthCallback;
