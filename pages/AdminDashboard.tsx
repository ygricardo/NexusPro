import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { authApi } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
    const { t } = useLanguage();
    const [stats, setStats] = useState({
        revenue: 0,
        activeSubs: 0,
        totalUsers: 0,
        activeLicenses: 0,
        loading: true,
        growthData: [] as any[]
    });

    useEffect(() => {
        calculateStats();
    }, []);

    const calculateStats = async () => {
        try {
            // Fetch profiles via Admin API
            const response = await authApi.getUsers();
            const result = await response.json();

            if (!result.success || !result.data) {
                console.error('Error fetching admin data:', result.message);
                setStats(s => ({ ...s, loading: false }));
                return;
            }

            const profiles = result.data;
            let revenue = 0;
            let subs = 0;
            let licenses = 0;

            profiles.forEach((p: any) => {
                const plan = p.plan?.toLowerCase();
                const status = p.status?.toLowerCase();

                // Revenue Calculation
                if (plan === 'rbt_pro' || plan === 'basic') {
                    revenue += 19.99;
                    subs++;
                } else if (plan === 'analyst_pro' || plan === 'advanced') {
                    revenue += 44.99;
                    subs++;
                } else if (plan === 'elite') {
                    revenue += 69.99;
                    subs++;
                }

                // License Calculation (Mock logic: 1 license per active user)
                if (status === 'active') {
                    licenses++;
                }
            });

            // Process Growth Data
            const growthMap = new Map<string, number>();
            profiles.forEach((p: any) => {
                if (p.created_at) {
                    const date = new Date(p.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }); // e.g: "Dec 24"
                    growthMap.set(date, (growthMap.get(date) || 0) + 1);
                }
            });

            // Convert to array and sort
            let cumulativeUsers = 0;
            const sortedDates = Array.from(growthMap.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

            const growthData = sortedDates.map(date => {
                cumulativeUsers += growthMap.get(date) || 0;
                return { name: date, users: cumulativeUsers };
            });

            // If no dates (old users without created_at), just show flat line or 1 point
            if (growthData.length === 0) {
                growthData.push({ name: 'Total', users: profiles.length });
            }

            setStats({
                revenue,
                activeSubs: subs,
                totalUsers: profiles.length,
                activeLicenses: licenses,
                loading: false,
                growthData
            });
        } catch (error) {
            console.error('Error fetching admin stats:', error);
            setStats(s => ({ ...s, loading: false }));
        }
    };

    const metricCards = [
        {
            title: 'Total Users',
            value: stats.totalUsers,
            icon: 'group',
            color: 'bg-primary',
            subtext: 'Registered accounts'
        },
        {
            title: 'Active Memberships',
            value: stats.activeSubs,
            icon: 'card_membership',
            color: 'bg-secondary',
            subtext: 'Paying subscribers'
        },
        {
            title: 'Active Licenses',
            value: stats.activeLicenses, // Using active users as proxy for now
            icon: 'badge',
            color: 'bg-neutral-600',
            subtext: 'Users with Active status'
        },
        {
            title: 'Monthly Revenue',
            value: `$${stats.revenue.toFixed(2)}`,
            icon: 'payments',
            color: 'bg-red-400',
            subtext: 'Estimated recurr. revenue'
        }
    ];

    return (
        <Layout>
            <div className="space-y-6 animate-fade-in-up">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Admin Dashboard</h1>
                    <p className="text-sm text-blue-200/60">Overview of system performance and metrics.</p>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {metricCards.map((card, index) => (
                        <div key={index} className="glass-card relative overflow-hidden p-6 group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
                                <span className={`material-symbols-outlined text-6xl ${card.color.replace('bg-', 'text-')}`}>{card.icon}</span>
                            </div>

                            <div className="relative z-10">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${card.color === 'bg-primary' ? 'from-primary to-blue-600' : card.color === 'bg-secondary' ? 'from-secondary to-yellow-500' : card.color === 'bg-red-400' ? 'from-danger to-red-600' : 'from-neutral-700 to-neutral-600'} text-white shadow-lg`}>
                                    <span className="material-symbols-outlined text-2xl drop-shadow-md">{card.icon}</span>
                                </div>

                                <div className="mt-4">
                                    <dt className="truncate text-sm font-medium text-blue-200/60 uppercase tracking-wider">{card.title}</dt>
                                    <dd className="mt-1 flex items-baseline">
                                        <span className={`text-3xl font-black text-white ${card.color === 'bg-secondary' ? 'text-glow-yellow' : card.color === 'bg-red-400' ? 'text-glow-red' : 'text-glow'}`}>
                                            {stats.loading ? '...' : card.value}
                                        </span>
                                    </dd>
                                </div>
                            </div>

                            <div className="mt-4 border-t border-white/5 pt-3 relative z-10">
                                <div className="text-xs font-medium text-white/50 group-hover:text-white/80 transition-colors">
                                    {card.subtext}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Growth Chart Section */}
                <div className="glass-card p-8 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div>
                            <h3 className="text-xl font-bold text-white text-glow">User Growth Trend</h3>
                            <p className="text-sm text-blue-200/60">New user registrations over time</p>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                            <span className="material-symbols-outlined text-primary">show_chart</span>
                        </div>
                    </div>

                    <div className="h-[350px] w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.growthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                    dx={-10}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(11, 17, 32, 0.9)',
                                        borderColor: 'rgba(255,255,255,0.1)',
                                        borderRadius: '16px',
                                        color: '#fff',
                                        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
                                        backdropFilter: 'blur(10px)'
                                    }}
                                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="users"
                                    stroke="#3b82f6"
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorUsers)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Additional Sections */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="glass-card rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <a href="#/admin-users" className="flex items-center justify-center p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer group hover:scale-[1.02]">
                                <div className="text-center">
                                    <span className="material-symbols-outlined text-3xl mb-2 text-primary group-hover:scale-110 transition-transform shadow-glow-text">manage_accounts</span>
                                    <div className="text-sm font-bold text-white">Manage Users</div>
                                </div>
                            </a>
                            <a href="#/admin-membership" className="flex items-center justify-center p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer group hover:scale-[1.02]">
                                <div className="text-center">
                                    <span className="material-symbols-outlined text-3xl mb-2 text-secondary group-hover:scale-110 transition-transform shadow-glow-yellow">card_membership</span>
                                    <div className="text-sm font-bold text-white">Membership Plans</div>
                                </div>
                            </a>
                        </div>
                    </div>

                    <div className="glass-card rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">System Health</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                <span className="text-sm text-blue-200/80">Database Connection</span>
                                <span className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]"></span>
                                    Operational
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                <span className="text-sm text-blue-200/80">API Status</span>
                                <span className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]"></span>
                                    Operational
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                <span className="text-sm text-blue-200/80">Last Backup</span>
                                <span className="text-sm font-medium text-white">Today, 02:00 AM</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout >
    );
};

export default AdminDashboard;
