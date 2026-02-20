import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import { Link } from 'react-router-dom';

const AIOrb = () => {
    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-0">
            {/* Central Core - Blue Glow */}
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-[20rem] h-[20rem] bg-primary/30 rounded-full blur-[80px] absolute"
            />

            {/* Inner Ring - Cyan */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-[28rem] h-[28rem] rounded-full absolute border border-cyan-400/20 shadow-[0_0_20px_rgba(34,211,238,0.2)] border-t-cyan-400/60 border-r-transparent"
            />

            {/* Outer Ring - Yellow Accent */}
            <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                style={{ transformOrigin: "center" }}
                className="w-[36rem] h-[36rem] rounded-full absolute border border-secondary/10 border-b-secondary/50 border-l-transparent opacity-60"
            />

            {/* Floating Particles */}
            {[...Array(8)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white]"
                    initial={{ x: 0, y: 0, opacity: 0 }}
                    animate={{
                        x: [Math.random() * 200 - 100, Math.random() * 400 - 200],
                        y: [Math.random() * 200 - 100, Math.random() * 400 - 200],
                        opacity: [0, 0.8, 0],
                        scale: [0, 1.5, 0]
                    }}
                    transition={{
                        duration: 5 + Math.random() * 3,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                        ease: "easeInOut"
                    }}
                />
            ))}
        </div>
    )
}

const Login = () => {
    const navigate = useNavigate();
    const { signIn, user, signOut } = useUser();

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Force logout on mount to prevent stale sessions
    useEffect(() => {
        signOut();
    }, []);

    // Load saved email
    useEffect(() => {
        const savedEmail = localStorage.getItem('nexus_saved_email');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, [setEmail, setRememberMe]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Save or clear email based on preference
        if (rememberMe) {
            localStorage.setItem('nexus_saved_email', email);
        } else {
            localStorage.removeItem('nexus_saved_email');
        }

        const { error } = await signIn(email, password);
        setLoading(false);

        if (error) {
            setError(error.message || 'Login failed');
        } else {
            navigate('/');
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-midnight font-display overflow-hidden selection:bg-primary/30 selection:text-white">
            {/* Left Side - Form Section */}
            <div className="flex w-full flex-col justify-center px-6 py-12 lg:px-20 xl:px-24 w-full lg:w-1/2 z-10 relative bg-midnight/50 backdrop-blur-sm lg:backdrop-blur-none">
                <div className="mx-auto w-full max-w-sm lg:w-96 flex flex-col justify-center h-full">

                    {/* Brand Header */}
                    <div className="flex flex-col gap-6 mb-12">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center size-12 rounded-2xl bg-gradient-to-br from-primary to-cyan-400 text-white shadow-lg shadow-primary/20">
                                <span className="material-symbols-outlined text-[28px]">hub</span>
                            </div>
                            <span className="text-2xl font-black tracking-tighter text-white">NexusPro</span>
                        </div>

                        <div>
                            <h2 className="text-4xl font-black tracking-tighter text-white mb-2 text-glow">
                                Welcome back.
                            </h2>
                            <p className="text-blue-200/60 font-medium">
                                Secure access to your clinical dashboard.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email Field */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-xs font-black uppercase tracking-widest text-blue-300/50 ml-1">
                                Email
                            </label>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-blue-200/30 text-[22px] group-focus-within:text-cyan-400 transition-colors duration-300">mail</span>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full rounded-2xl border-none bg-white/5 py-4 pl-20 pr-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary/50 focus:bg-white/10 transition-all font-medium text-lg shadow-inner"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-xs font-black uppercase tracking-widest text-blue-300/50 ml-1">
                                Password
                            </label>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-blue-200/30 text-[22px] group-focus-within:text-cyan-400 transition-colors duration-300">lock</span>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-2xl border-none bg-white/5 py-4 pl-20 pr-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary/50 focus:bg-white/10 transition-all font-medium text-lg shadow-inner"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {/* Remember & Forgot */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`size-5 rounded-lg border flex items-center justify-center transition-all duration-200 ${rememberMe ? 'bg-primary border-primary' : 'bg-transparent border-white/20 group-hover:border-white/40'}`}>
                                    {rememberMe && <span className="material-symbols-outlined text-[16px] text-white font-bold">check</span>}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="hidden"
                                />
                                <span className="text-sm font-bold text-blue-200/60 group-hover:text-white transition-colors">Remember me</span>
                            </label>

                            <a href="#" className="text-sm font-bold text-secondary hover:text-yellow-300 transition-colors">
                                Forgot password?
                            </a>
                        </div>

                        {/* Error Message */}
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

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-blue-600 hover:to-blue-500 text-white font-black text-lg shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden group"
                        >
                            {loading ? (
                                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </>
                            )}
                            {/* Shine effect */}
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-12 text-center space-y-4">
                        <p className="text-sm text-blue-200/40 font-medium">New to NexusPro?</p>
                        <div className="flex gap-4 justify-center">
                            <Link to="/register" className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold transition-all hover:scale-105 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">person_add</span>
                                Create Account
                            </Link>
                            <a href="/plans" className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold transition-all hover:scale-105 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                                View Plans
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Visual Showcase */}
            <div className="hidden lg:flex w-1/2 relative bg-midnight items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-midnight to-midnight opacity-50" />

                {/* AI / Tech Visual */}
                <div className="relative w-full h-full flex flex-col items-center justify-center">

                    {/* Background Orb - Positioned absolutely to center */}
                    <AIOrb />

                    {/* Content Overlay */}
                    <div className="relative z-10 text-center space-y-8 p-12 max-w-xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-500/20 backdrop-blur-md shadow-lg shadow-emerald-500/10 mb-4">
                            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase text-glow">System Operational</span>
                        </div>

                        <h1 className="text-6xl font-black text-white leading-tight drop-shadow-2xl">
                            The Future of <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-300 to-primary bg-300% animate-gradient">Clinical Data</span>.
                        </h1>

                        <p className="text-blue-200/80 text-lg leading-relaxed font-medium">
                            Join thousands of clinicians using NexusPro to streamline ABA therapy collection, analysis, and reporting.
                        </p>

                        {/* Feature Pills */}
                        <div className="flex justify-center gap-4 pt-4">
                            {[
                                { icon: 'lock', label: 'HITRUST\nAuthorized', color: 'text-secondary' },
                                { icon: 'bolt', label: 'Real-time\nSync', color: 'text-yellow-400' },
                                { icon: 'ssid_chart', label: 'AI\nAnalytics', color: 'text-primary' }
                            ].map((f, i) => (
                                <div key={i} className="glass-card p-4 flex flex-col items-center gap-3 w-28 hover:bg-white/10 transition-transform hover:-translate-y-1">
                                    <span className={`material-symbols-outlined ${f.color} text-3xl mb-1 drop-shadow-md`}>{f.icon}</span>
                                    <span className="text-[10px] font-bold text-center text-white/90 uppercase tracking-widest leading-tight whitespace-pre-line">{f.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;