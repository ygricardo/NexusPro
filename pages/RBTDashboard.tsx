import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabaseClient';
import { authApi } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import ClientModal from '../components/ClientModal';
import UpgradeModal from '../components/UpgradeModal';

// --- Interfaces ---
interface Client {
    id: string;
    first_name: string;
    last_name: string;
    diagnosis: string;
    status: string;
    avatar_url: string;
    target_progress: number;
}

interface GeneratedNote {
    id: string;
    module_type: 'RBT' | 'BCBA';
    created_at: string;
    input_data: any;
    output_data: any;
    clients?: { id: string, first_name: string; last_name: string };
}

interface ActivityItem {
    id: string;
    type: 'AI_ANALYSIS' | 'CLINICAL_NOTE';
    module?: string;
    rawModule?: string;
    client_name: string;
    client_id?: string;
    date: string;
    preview?: string;
}

// --- Animation Variants ---
const containerVars = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVars = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

// --- Components ---

const QuickActionCard = ({ title, desc, icon, to, colorClass, delay }: any) => (
    <motion.div
        variants={itemVars}
        whileHover={{ y: -5 }}
        className="group relative overflow-hidden rounded-[2rem] p-6 bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/5 hover:border-white/20 transition-all cursor-pointer backdrop-blur-md"
    >
        <Link to={to} className="absolute inset-0 z-20" />
        <div className={`absolute -right-4 -top-4 size-24 rounded-full opacity-20 blur-2xl transition-transform group-hover:scale-150 ${colorClass.replace('text-', 'bg-')}`} />

        <div className="relative z-10 flex flex-col h-full">
            <div className={`size-12 rounded-2xl flex items-center justify-center mb-4 ${colorClass.replace('text-', 'bg-').replace('500', '500/20')} backdrop-blur-sm`}>
                <span className={`material-symbols-outlined text-2xl ${colorClass}`}>{icon}</span>
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1 group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">{desc}</p>
        </div>
    </motion.div>
);

const StatCard = ({ title, value, subtext, icon, colorClass, trend }: any) => (
    <motion.div
        variants={itemVars}
        className="relative overflow-hidden bg-white dark:bg-neutral-900/50 backdrop-blur-xl rounded-[2rem] p-6 border border-neutral-100 dark:border-neutral-800/60 shadow-sm hover:shadow-lg transition-all"
    >
        <div className="flex justify-between items-start mb-4">
            <div className={`size-10 rounded-xl flex items-center justify-center ${colorClass.replace('text-', 'bg-').replace('500', '500/10')}`}>
                <span className={`material-symbols-outlined text-xl ${colorClass}`}>{icon}</span>
            </div>
            {trend && (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full border border-emerald-500/20">
                    <span className="material-symbols-outlined text-xs">trending_up</span> {trend}
                </span>
            )}
        </div>

        <div className="flex flex-col">
            <span className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight leading-none mb-1">{value}</span>
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">{title}</span>
        </div>
    </motion.div>
);

const QuickAction = ({ title, icon, to, onClick, colorClass }: any) => (
    <motion.div
        variants={itemVars}
        whileHover={{ y: -5, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="group relative flex flex-col items-center justify-center p-4 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[2rem] hover:border-primary/30 transition-all hover:shadow-xl cursor-pointer overflow-hidden"
    >
        {to && <Link to={to} className="absolute inset-0 z-10" />}
        <div className={`size-12 rounded-2xl flex items-center justify-center mb-2 ${colorClass.replace('text-', 'bg-').replace('500', '500/10')} group-hover:scale-110 transition-transform`}>
            <span className={`material-symbols-outlined text-2xl ${colorClass}`}>{icon}</span>
        </div>
        <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{title}</span>
    </motion.div>
);

const RBTDashboard = () => {
    const { user, checkAccess } = useUser();
    const { t } = useLanguage();
    const navigate = useNavigate();

    // Data State
    const [clients, setClients] = useState<Client[]>([]);
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [stats, setStats] = useState({
        rbtCount: 0,
        bcbaCount: 0,
        totalNotes: 0,
        activeClients: 0
    });
    const [loading, setLoading] = useState(true);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Parallel fetch for speed
            const [clientsRes, historyRes, notesRes] = await Promise.all([
                authApi.getClients(),
                authApi.fetchGenerationHistory('ALL'),
                authApi.getNotesByUser()
            ]);

            let clientList = [];
            if (clientsRes.ok) clientList = await clientsRes.json();

            let historyList = [];
            if (historyRes.ok) {
                const hJson = await historyRes.json();
                historyList = hJson.data || [];
            }

            let notesList = [];
            if (notesRes.ok) notesList = await notesRes.json();

            // Transform into Activity Items
            const aiActivities: ActivityItem[] = historyList.map((h: any) => ({
                id: h.id,
                type: 'AI_ANALYSIS',
                module: h.module_type === 'RBT' ? t('rbtGenerator') : t('bcbaGenerator'),
                rawModule: h.module_type,
                client_name: h.clients ? `${h.clients.first_name} ${h.clients.last_name}` : 'Unknown Client',
                client_id: h.client_id,
                date: h.created_at
            }));

            const noteActivities: ActivityItem[] = notesList.map((n: any) => ({
                id: n.id,
                type: 'CLINICAL_NOTE',
                client_name: n.clients ? `${n.clients.first_name} ${n.clients.last_name}` : (n.case_tag || 'Session Note'),
                client_id: n.client_id,
                date: n.created_at,
                preview: n.content?.substring(0, 100)
            }));

            const mergedActivities = [...aiActivities, ...noteActivities]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10);

            setClients(clientList);
            setActivities(mergedActivities);
            setStats({
                rbtCount: historyList.filter((h: any) => h.module_type === 'RBT').length,
                bcbaCount: historyList.filter((h: any) => h.module_type === 'BCBA').length,
                totalNotes: notesList.length,
                activeClients: clientList.filter((c: any) => c.status === 'Active').length
            });

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <motion.div
                variants={containerVars}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-8 w-full pb-12 max-w-7xl mx-auto"
            >
                {/* Header Section */}
                <div className="pt-2 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-neutral-900 dark:text-white tracking-tighter mb-1">
                            Overview
                        </h1>
                        <p className="text-neutral-500 dark:text-neutral-400 font-medium">
                            Welcome back, <span className="text-neutral-900 dark:text-white font-bold">{user?.name?.split(' ')[0]}</span>. Here's what's happening today.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={fetchDashboardData}
                            className="size-10 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm active:scale-95 group"
                            title="Refresh Dashboard"
                        >
                            <span className={`material-symbols-outlined text-xl transition-all ${loading ? 'animate-spin text-primary' : 'text-neutral-500 group-hover:text-primary'}`}>
                                refresh
                            </span>
                        </button>
                        <span className="hidden md:flex items-center gap-2 text-xs font-bold text-neutral-400 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            System Operational
                        </span>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Active Caseload"
                        value={stats.activeClients}
                        icon="groups"
                        colorClass="text-emerald-500"
                        trend={stats.activeClients > 0 ? "+1 this week" : null}
                    />
                    <StatCard
                        title={t('rbtGenerator')}
                        value={stats.rbtCount}
                        icon="query_stats"
                        colorClass="text-blue-500"
                        trend={stats.rbtCount > 0 ? "+3 this week" : null}
                    />
                    <StatCard
                        title={t('bcbaGenerator')}
                        value={stats.bcbaCount}
                        icon="analytics"
                        colorClass="text-purple-500"
                    />
                    <StatCard
                        title="Total Clinical Notes"
                        value={stats.totalNotes}
                        icon="description"
                        colorClass="text-amber-500"
                    />
                </div>

                {/* Quick Actions */}
                {/* Quick Actions */}
                <div className="flex gap-4">
                    <QuickAction
                        title="New Client"
                        icon="person_add"
                        onClick={() => setIsClientModalOpen(true)}
                        colorClass="text-emerald-500"
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Left Column: Clients List */}
                    <div className="xl:col-span-2 space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Active Clients</h3>
                            <Link to="/clients" className="text-xs font-bold text-primary hover:underline">View Directory</Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <AnimatePresence mode="popLayout">
                                {loading && clients.length === 0 ? (
                                    [...Array(6)].map((_, i) => (
                                        <div key={i} className="h-24 rounded-[1.5rem] bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
                                    ))
                                ) : clients.length > 0 ? (
                                    clients.slice(0, 6).map((client) => (
                                        <motion.div
                                            key={client.id}
                                            variants={itemVars}
                                            whileHover={{ scale: 1.01, x: 5 }}
                                            className="group flex p-4 bg-white dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800 rounded-[1.5rem] hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer"
                                            onClick={() => navigate(`/clients`)}
                                        >
                                            <div className="size-12 rounded-xl bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-sm font-black text-primary mr-3 shadow-inner">
                                                {client.first_name[0]}{client.last_name[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-bold text-sm text-neutral-900 dark:text-white truncate">{client.first_name} {client.last_name}</h4>
                                                    <span className={`size-1.5 rounded-full mt-1 ${client.status === 'Active' ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
                                                </div>
                                                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate mb-2 uppercase font-bold tracking-tight">{client.diagnosis || 'No Diagnosis'}</p>

                                                {/* Mini Progress Bar */}
                                                <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${client.target_progress || 0}%` }} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-12 px-6 text-center bg-white/50 dark:bg-neutral-900/30 rounded-[2rem] border border-dashed border-neutral-200 dark:border-neutral-800 flex flex-col items-center">
                                        <div className="size-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                                            <span className="material-symbols-outlined text-3xl text-neutral-400">group_off</span>
                                        </div>
                                        <h4 className="font-bold text-neutral-900 dark:text-white mb-1">Your clinical caseload is empty</h4>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto mb-6">Start by adding your first client profile to begin tracking data.</p>
                                        <Link to="/clients" className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95">
                                            Add New Client
                                        </Link>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Right Column: Recent Activity */}
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between px-1 mb-4">
                            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Recent Activity</h3>
                        </div>

                        <div className="flex-1 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xl rounded-[2.5rem] border border-white/20 dark:border-neutral-800 p-2 overflow-hidden flex flex-col min-h-[500px]">
                            {loading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <span className="material-symbols-outlined animate-spin text-neutral-300">progress_activity</span>
                                </div>
                            ) : activities.length > 0 ? (
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                    {activities.map((item) => (
                                        <div
                                            key={item.id}
                                            onClick={() => {
                                                let hasAccess = true;
                                                if (item.type === 'AI_ANALYSIS') {
                                                    const moduleKey = item.rawModule === 'RBT' ? 'rbt_generator' : 'bcba_generator';
                                                    hasAccess = checkAccess([], false, moduleKey);
                                                    if (hasAccess) {
                                                        navigate(item.rawModule === 'RBT' ? `/rbt-generator?client_id=${item.client_id || ''}` : `/bcba-generator?client_id=${item.client_id || ''}`);
                                                    }
                                                } else {
                                                    hasAccess = checkAccess([], false, 'note_generator');
                                                    if (hasAccess) {
                                                        navigate(`/session-note?client_id=${item.client_id || ''}`);
                                                    }
                                                }

                                                if (!hasAccess) {
                                                    setIsUpgradeModalOpen(true);
                                                }
                                            }}
                                            className="block p-4 rounded-3xl hover:bg-white dark:hover:bg-neutral-800 transition-all border border-transparent hover:border-neutral-100 dark:hover:border-neutral-700 group cursor-pointer relative"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`size-10 rounded-xl flex items-center justify-center text-lg ${item.type === 'AI_ANALYSIS'
                                                    ? (item.module === 'RBT' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400')
                                                    : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                                                    }`}>
                                                    <span className="material-symbols-outlined text-lg">
                                                        {item.type === 'AI_ANALYSIS' ? (item.module === 'RBT' ? 'query_stats' : 'analytics') : 'description'}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                                                        {item.type === 'AI_ANALYSIS' ? `${item.module} Analysis` : 'Clinical Session Note'}
                                                    </p>
                                                    <p className="text-xs text-neutral-600 dark:text-neutral-300 truncate">
                                                        {item.client_name}
                                                    </p>
                                                    <p className="text-[10px] text-neutral-500 uppercase font-black tracking-wider mt-1 opacity-60">
                                                        {new Date(item.date).toLocaleDateString()} at {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-64 flex flex-col items-center justify-center text-neutral-500">
                                    <span className="material-symbols-outlined text-4xl opacity-20 mb-2">description_pause</span>
                                    <p className="text-sm italic">No activity recorded yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </motion.div>

            <ClientModal
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                onSuccess={() => {
                    fetchDashboardData();
                    // Optional: Show success toast
                }}
            />

            <UpgradeModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
            />
        </Layout >
    );
};

export default RBTDashboard;