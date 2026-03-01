import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import { useConfirm } from '../contexts/ConfirmContext';

// Google SVG icon
const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

const Register = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { signUp, signInWithGoogle } = useUser();
    const { showAlert } = useConfirm();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const handleGoogleSignUp = async () => {
        setError('');
        setGoogleLoading(true);
        const { error } = await signInWithGoogle();
        if (error) {
            setError(error.message || 'Google sign-up failed');
            setGoogleLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const searchParams = new URLSearchParams(location.search);
        const validPlans = ['basic', 'advanced', 'elite'];
        const planParam = searchParams.get('plan');
        const plan = validPlans.includes(planParam || '') ? planParam || 'basic' : 'basic';

        const { error } = await signUp(email.trim(), password, fullName, 'user', plan);
        setLoading(false);

        if (error) {
            setError(error.message || 'Registration failed');
        } else {
            await showAlert('Success', 'Account created! Please check your email to confirm, then log in.', 'success');
            navigate('/login');
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-midnight font-display overflow-hidden selection:bg-primary/30 selection:text-white">
            <div className="flex w-full flex-col justify-center px-6 py-12 lg:px-20 xl:px-24 z-10 relative lg:w-1/2">
                <div className="mx-auto w-full max-w-sm lg:w-96 flex flex-col justify-center">

                    {/* Brand Header */}
                    <div className="flex flex-col gap-6 mb-10">
                        <Link to="/login" className="flex items-center gap-3 w-fit">
                            <div className="flex items-center justify-center size-12 rounded-2xl bg-gradient-to-br from-primary to-cyan-400 text-white shadow-lg shadow-primary/20">
                                <span className="material-symbols-outlined text-[28px]">hub</span>
                            </div>
                            <span className="text-2xl font-black tracking-tighter text-white">NexusPro</span>
                        </Link>

                        <div>
                            <h2 className="text-4xl font-black tracking-tighter text-white mb-2">
                                Create account.
                            </h2>
                            <p className="text-blue-200/60 font-medium">
                                Join the clinical AI ecosystem.
                            </p>
                        </div>
                    </div>

                    {/* Google Sign-Up Button — Primary CTA */}
                    <motion.button
                        type="button"
                        onClick={handleGoogleSignUp}
                        disabled={googleLoading || loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 text-white font-bold text-base transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
                    >
                        {googleLoading ? (
                            <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                        ) : (
                            <GoogleIcon />
                        )}
                        <span>Continue with Google</span>
                    </motion.button>

                    {/* OR Divider */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-xs font-bold text-white/30 uppercase tracking-widest">or sign up with email</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Email/Password Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Full Name */}
                        <div className="space-y-2">
                            <label htmlFor="name" className="block text-xs font-black uppercase tracking-widest text-blue-300/50 ml-1">
                                Full Name
                            </label>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-blue-200/30 text-[22px] group-focus-within:text-cyan-400 transition-colors duration-300">person</span>
                                <input
                                    id="name"
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="block w-full rounded-2xl border-none bg-white/5 py-4 pl-20 pr-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary/50 focus:bg-white/10 transition-all font-medium text-lg shadow-inner"
                                    placeholder="Dr. Jane Smith"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-xs font-black uppercase tracking-widest text-blue-300/50 ml-1">
                                Email
                            </label>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-blue-200/30 text-[22px] group-focus-within:text-cyan-400 transition-colors duration-300">mail</span>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full rounded-2xl border-none bg-white/5 py-4 pl-20 pr-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary/50 focus:bg-white/10 transition-all font-medium text-lg shadow-inner"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-xs font-black uppercase tracking-widest text-blue-300/50 ml-1">
                                Password
                            </label>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-blue-200/30 text-[22px] group-focus-within:text-cyan-400 transition-colors duration-300">lock</span>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    minLength={8}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-2xl border-none bg-white/5 py-4 pl-20 pr-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary/50 focus:bg-white/10 transition-all font-medium text-lg shadow-inner"
                                    placeholder="Min. 8 characters"
                                />
                            </div>
                        </div>

                        {/* Error */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="p-4 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-sm font-bold flex items-center gap-3"
                                >
                                    <span className="material-symbols-outlined">error</span>
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || googleLoading}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-blue-600 hover:to-blue-500 text-white font-black text-lg shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden group"
                        >
                            {loading ? (
                                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                            ) : (
                                <>
                                    <span>Create Account</span>
                                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 text-center space-y-3">
                        <p className="text-sm text-blue-200/40 font-medium">
                            Already have an account?{' '}
                            <Link to="/login" className="text-secondary hover:text-yellow-300 font-bold transition-colors">
                                Sign in
                            </Link>
                        </p>
                        <p className="text-xs text-blue-200/25">
                            By creating an account, you agree to our{' '}
                            <Link to="/terms" className="text-blue-200/50 hover:text-white transition-colors underline underline-offset-2">
                                Terms of Service
                            </Link>
                            {' '}and{' '}
                            <Link to="/privacy" className="text-blue-200/50 hover:text-white transition-colors underline underline-offset-2">
                                Privacy Policy
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Visual */}
            <div className="hidden lg:flex w-1/2 relative bg-midnight items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-midnight to-midnight opacity-50" />
                <div className="relative z-10 text-center space-y-6 p-12 max-w-md">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-cyan-500/20 backdrop-blur-md">
                        <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase">Secure Platform</span>
                    </div>
                    <h1 className="text-5xl font-black text-white leading-tight drop-shadow-2xl">
                        Start Your{' '}<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-300 to-primary bg-300% animate-gradient">
                            Clinical Journey
                        </span>
                    </h1>
                    <p className="text-blue-200/70 text-lg leading-relaxed font-medium">
                        Create an account and get instant access to AI-powered clinical documentation tools designed for ABA professionals.
                    </p>
                    <div className="flex justify-center gap-3 pt-2 flex-wrap">
                        {[
                            { icon: 'description', label: 'Session Notes', color: 'text-primary' },
                            { icon: 'bar_chart', label: 'Daily Data', color: 'text-cyan-400' },
                            { icon: 'analytics', label: 'Weekly Reports', color: 'text-secondary' },
                        ].map((f, i) => (
                            <div key={i} className="glass-card p-4 flex flex-col items-center gap-2 w-28 hover:bg-white/10 transition-transform hover:-translate-y-1">
                                <span className={`material-symbols-outlined ${f.color} text-3xl drop-shadow-md`}>{f.icon}</span>
                                <span className="text-[10px] font-bold text-center text-white/90 uppercase tracking-widest">{f.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
