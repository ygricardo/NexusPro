import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Shield,
    AlertCircle,
    Info,
    Search,
    RefreshCw,
    Clock,
    Terminal,
    Filter
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export default function AdminLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [levelFilter, setLevelFilter] = useState('all');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const url = levelFilter === 'all'
                ? '/api/admin/logs?limit=50'
                : `/api/admin/logs?level=${levelFilter}&limit=50`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                setLogs(result.data);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [levelFilter]);

    const getLevelColor = (level) => {
        switch (level.toLowerCase()) {
            case 'error': return 'text-red-500 bg-red-50 border-red-100';
            case 'warn': return 'text-amber-500 bg-amber-50 border-amber-100';
            case 'info': return 'text-blue-500 bg-blue-50 border-blue-100';
            default: return 'text-slate-500 bg-slate-50 border-slate-100';
        }
    };

    const filteredLogs = logs.filter(log =>
        log.message.toLowerCase().includes(filter.toLowerCase()) ||
        JSON.stringify(log.meta).toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Terminal className="text-primary-600" />
                        System Audit Logs
                    </h1>
                    <p className="text-slate-500">Monitor system activity, errors, and security events.</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchLogs}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Refresh logs"
                    >
                        <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500 transition-all text-sm"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                        className="bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500 text-sm py-2 px-4 cursor-pointer"
                        value={levelFilter}
                        onChange={(e) => setLevelFilter(e.target.value)}
                    >
                        <option value="all">All Levels</option>
                        <option value="error">Errors</option>
                        <option value="warn">Warnings</option>
                        <option value="info">Info</option>
                    </select>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-3 font-semibold text-slate-700 w-40">Timestamp</th>
                                <th className="px-4 py-3 font-semibold text-slate-700 w-24">Level</th>
                                <th className="px-4 py-3 font-semibold text-slate-700">Message</th>
                                <th className="px-4 py-3 font-semibold text-slate-700">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
                                        Loading system logs...
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                                        No logs found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        key={log.id}
                                        className="hover:bg-slate-50/50 transition-colors"
                                    >
                                        <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                                                getLevelColor(log.level)
                                            )}>
                                                {log.level}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-700">
                                            {log.message}
                                        </td>
                                        <td className="px-4 py-3">
                                            {log.meta && Object.keys(log.meta).length > 0 && (
                                                <div className="text-[10px] bg-slate-900 text-slate-300 p-2 rounded font-mono max-w-md overflow-x-auto">
                                                    <pre>{JSON.stringify(log.meta, null, 2)}</pre>
                                                </div>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex items-center justify-between px-2">
                <p className="text-xs text-slate-400 italic">
                    Showing latest 50 logs. All timestamps are in local time.
                </p>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Shield className="w-3 h-3" />
                    Protected by Winston Audit System
                </div>
            </div>
        </div>
    );
}
