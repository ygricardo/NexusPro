import React from 'react';
import Layout from '../components/Layout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
    { name: 'Mon', score: 40 },
    { name: 'Tue', score: 65 },
    { name: 'Wed', score: 55 },
    { name: 'Thu', score: 85 },
    { name: 'Fri', score: 80 },
    { name: 'Sat', score: 95 },
    { name: 'Sun', score: 90 },
];

const BCBADashboard = () => {
    const headerContent = (
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold leading-tight dark:text-white">Client: Liam S.</h2>
                <span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold">Active</span>
            </div>
        </div>
    );

    return (
        <Layout>
            <div className="flex-1 space-y-6">
                <h2 className="text-2xl font-bold dark:text-white">Objective Analysis</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-2 rounded-xl p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-surface-dark shadow-sm">
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium">Mastery Status</p>
                        <div className="flex items-baseline gap-2 mt-1"><p className="text-neutral-900 dark:text-white text-2xl font-bold">80%</p> <span className="text-green-500 text-xs font-bold">+5%</span></div>
                    </div>
                    <div className="flex flex-col gap-2 rounded-xl p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-surface-dark shadow-sm">
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium">Behaviors / Hour</p>
                        <div className="flex items-baseline gap-2 mt-1"><p className="text-neutral-900 dark:text-white text-2xl font-bold">1.2</p> <span className="text-green-500 text-xs font-bold">-0.5</span></div>
                    </div>
                </div>

                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-surface-dark p-6 h-[400px] flex flex-col">
                    <h3 className="text-lg font-bold mb-4 dark:text-white">Skill Acquisition Trend</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#DC2626" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#404040" opacity={0.2} />
                            <XAxis dataKey="name" stroke="#737373" />
                            <YAxis stroke="#737373" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '8px', color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="score" stroke="#DC2626" fillOpacity={1} fill="url(#colorScore)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </Layout>
    );
};

export default BCBADashboard;