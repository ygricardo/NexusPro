import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import Breadcrumbs from './Breadcrumbs';

interface HeaderProps {
    children?: React.ReactNode;
    sidebarOpen: boolean;
    toggleSidebar: () => void;
}

const Header = ({ children, sidebarOpen, toggleSidebar }: HeaderProps) => {
    const { t, language, setLanguage } = useLanguage();
    const { user, signOut } = useUser();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Reactive Search Logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.trim().length > 1 && user) {
                setIsSearching(true);
                try {
                    // Search Clients
                    const { data: clients } = await supabase
                        .from('clients')
                        .select('id, first_name, last_name')
                        .ilike('first_name', `%${searchTerm}%`)
                        .eq('user_id', user.id)
                        .limit(5);

                    // Allow admins to search users too, handled simply for now:
                    let results: any[] = clients?.map(c => ({
                        id: c.id,
                        type: 'client',
                        label: `${c.first_name} ${c.last_name}`,
                        link: `/clients/${c.id}`
                    })) || [];

                    setSearchResults(results);
                } catch (error) {
                    console.error("Search error:", error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, user]);

    // Notifications State
    const [notifications, setNotifications] = useState<any[]>([]);

    // Fetch Notifications
    useEffect(() => {
        if (!user) return;
        const fetchNotifications = async () => {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (data) setNotifications(data);
        };
        fetchNotifications();

        // Realtime Subscription
        const channel = supabase
            .channel('header_notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
                setNotifications(prev => [payload.new, ...prev]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    const markAsRead = async (id: string) => {
        // Optimistic UI update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const handleMarkAllRead = async () => {
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        setIsNotificationsOpen(false);
        if (user) {
            await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
        }
    };

    // Click outside to close content
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const displayName = user?.name || '';
    const displayAvatar = user?.avatar || '';

    return (
        <header className="glass-header flex h-20 items-center justify-between px-6 py-4 shadow-lg shadow-black/10 transition-shadow">
            <div className="flex items-center gap-4">
                {/* Mobile Toggle */}
                <button onClick={toggleSidebar} className="md:hidden text-white/50 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">menu</span>
                </button>
                {/* Left Area: Dynamic Title/Breadcrumbs */}
                <div className="flex flex-1 items-center gap-4">
                    <Breadcrumbs />
                </div>
            </div>

            {/* Right Area: Search, Notifications, Profile */}
            <div className="flex items-center gap-4">
                {/* Search Bar */}
                <div ref={searchRef} className="hidden md:block relative group">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-cyan-400 transition-colors z-10">search</span>
                        <input
                            type="text"
                            placeholder={t('search_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl py-2 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-primary/20 focus:border-primary/50 w-64 transition-all shadow-inner group-focus-within:w-80 outline-none placeholder:text-white/20"
                        />
                    </div>

                    {/* Search Dropdown */}
                    <AnimatePresence>
                        {isSearchFocused && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute right-0 top-full mt-4 w-96 glass-card ring-1 ring-white/10 z-50 overflow-hidden p-2 shadow-2xl shadow-black/50"
                            >
                                <div className="p-2">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2 pl-2">{searchTerm ? 'Search Results' : 'Recent Searches'}</h3>
                                    <div className="flex flex-col gap-1">
                                        {isSearching ? (
                                            <div className="p-8 text-center">
                                                <span className="material-symbols-outlined animate-spin text-primary text-2xl">progress_activity</span>
                                            </div>
                                        ) : searchResults.length > 0 ? (
                                            searchResults.map((result) => (
                                                <button
                                                    key={result.id}
                                                    onClick={() => { setIsSearchFocused(false); setSearchTerm(''); navigate(result.link); }}
                                                    className="flex items-center gap-3 w-full p-3 hover:bg-white/5 rounded-2xl text-left transition-all group border border-transparent hover:border-white/5"
                                                >
                                                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                                                        <span className="material-symbols-outlined text-[18px]">person</span>
                                                    </div>
                                                    <span className="text-sm text-white font-bold">{result.label}</span>
                                                </button>
                                            ))
                                        ) : searchTerm ? (
                                            <div className="p-4 text-sm text-white/40 text-center">No results found for "{searchTerm}"</div>
                                        ) : (
                                            <div className="p-4 text-sm text-white/30 text-center text-balance">Start typing to search across clients, notes, and tasks...</div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Notifications */}
                <div className="relative" ref={notificationRef}>
                    <button
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className="relative size-10 flex items-center justify-center rounded-2xl text-white/60 hover:text-cyan-300 hover:bg-white/5 transition-all active:scale-95 border border-transparent hover:border-white/5"
                    >
                        <span className="material-symbols-outlined text-[24px]">notifications</span>
                        {unreadCount > 0 && (
                            <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-danger ring-2 ring-midnight animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]"></span>
                        )}
                    </button>

                    <AnimatePresence>
                        {isNotificationsOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                className="absolute right-0 top-full mt-4 w-96 origin-top-right glass-card shadow-2xl shadow-black/50 ring-1 ring-white/10 z-50 overflow-hidden"
                            >
                                <div className="px-6 py-4 border-b border-white/20 dark:border-white/5 flex items-center justify-between">
                                    <h3 className="font-bold text-neutral-900 dark:text-white">{t('notifications')}</h3>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={handleMarkAllRead}
                                            className="text-xs text-secondary hover:text-primary font-bold uppercase tracking-wider transition-colors"
                                        >
                                            {t('mark_read')}
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-[350px] overflow-y-auto no-scrollbar p-2">
                                    {notifications.length > 0 ? (
                                        notifications.map((notif) => (
                                            <div key={notif.id} className={`p-4 rounded-3xl mb-1 hover:bg-white dark:hover:bg-neutral-800 transition-all relative group ${!notif.is_read ? 'bg-secondary/5' : 'bg-transparent'}`}>
                                                <div className="flex gap-4">
                                                    <div className={`mt-1.5 size-2 rounded-full shrink-0 shadow-lg ${!notif.is_read ? 'bg-secondary shadow-secondary/50' : 'bg-neutral-200 dark:bg-neutral-700'}`}></div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-neutral-900 dark:text-white leading-tight">{notif.title}</p>
                                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">{notif.message}</p>
                                                        <span className="text-[10px] text-neutral-400 mt-2 block font-mono opacity-60 group-hover:opacity-100 transition-opacity">{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-12 text-center text-neutral-500 dark:text-neutral-400 flex flex-col items-center">
                                            <div className="size-16 rounded-full bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-center mb-4">
                                                <span className="material-symbols-outlined text-3xl text-neutral-300">notifications_paused</span>
                                            </div>
                                            <p className="text-sm font-medium">{t('no_notifications')}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 border-t border-white/20 dark:border-white/5 text-center">
                                    <button className="text-xs font-bold text-neutral-400 hover:text-secondary transition-colors w-full py-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 uppercase tracking-widest">
                                        View History
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div >

                <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800 mx-1"></div>

                {/* Info / Language */}
                <button
                    onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
                    className="size-10 rounded-2xl text-xs font-black text-neutral-400 hover:text-secondary hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all uppercase"
                >
                    {language}
                </button>

                {/* User Menu */}
                {user ? (
                    <div className="relative">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="size-10 rounded-2xl bg-cover bg-center ring-2 ring-white dark:ring-neutral-800 shadow-lg hover:shadow-glow-yellow transition-all cursor-pointer relative"
                            style={{ backgroundImage: `url("${displayAvatar || `https://ui-avatars.com/api/?name=${displayName}`}")` }}
                        >
                            <div className="absolute -bottom-1 -right-1 size-3 bg-secondary rounded-full border-2 border-white dark:border-neutral-900"></div>
                        </motion.button>

                        <AnimatePresence>
                            {isUserMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        className="absolute right-0 top-full mt-4 w-64 origin-top-right rounded-[2rem] bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl p-2 shadow-2xl ring-1 ring-white/50 dark:ring-white/10 z-50"
                                    >
                                        <div className="px-4 py-4 border-b border-dashed border-neutral-200 dark:border-neutral-700/50 mb-2">
                                            <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">{displayName}</p>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mb-2">{user.email}</p>
                                            <div className="inline-flex items-center px-2 py-1 rounded-lg bg-secondary/10 text-secondary border border-secondary/20">
                                                <span className="text-[10px] font-black uppercase tracking-widest">
                                                    {user.role}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <Link to="/plans" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-800 rounded-xl transition-all group">
                                                <span className="material-symbols-outlined text-neutral-400 group-hover:text-secondary transition-colors">credit_card</span>
                                                Billing
                                            </Link>
                                            <Link to="/settings" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-800 rounded-xl transition-all group">
                                                <span className="material-symbols-outlined text-neutral-400 group-hover:text-secondary transition-colors">settings</span>
                                                Settings
                                            </Link>
                                        </div>

                                        <div className="mt-2 pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-700/50">
                                            <button
                                                onClick={handleLogout}
                                                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-neutral-500 hover:text-primary hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-xl transition-all"
                                            >
                                                <span className="material-symbols-outlined">logout</span>
                                                Sign out
                                            </button>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    <Link to="/login" className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-white hover:bg-secondary/90 transition-all text-sm font-bold shadow-md shadow-secondary/20">
                        <span className="material-symbols-outlined text-[18px]">login</span>
                        Sign In
                    </Link>
                )}
            </div >
        </header >
    );
};

export default Header;