import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    AlertCircle,
    Info,
    Search,
    RefreshCw,
    Terminal,
    Filter,
    X,
    ChevronRight,
    User,
    Globe
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { apiFetch } from '../lib/api';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export default function AdminLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [levelFilter, setLevelFilter] = useState('all');
    const [selectedLog, setSelectedLog] = useState<any | null>(null);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const url = levelFilter === 'all'
                ? '/admin/logs?limit=50'
                : `/admin/logs?level=${levelFilter}&limit=50`;

            const res = await apiFetch(url);
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

    const getLevelColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'error': return 'text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_10px_rgba(248,113,113,0.1)]';
            case 'warn': return 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_10px_rgba(251,191,36,0.1)]';
            case 'info': return 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-[0_0_10px_rgba(96,165,250,0.1)]';
            default: return 'text-slate-400 bg-slate-800 border-slate-700';
        }
    };

    const filteredLogs = logs.filter(log =>
        log.message.toLowerCase().includes(filter.toLowerCase()) ||
        JSON.stringify(log.meta).toLowerCase().includes(filter.toLowerCase())
    );

    // Helper to extract a summary from meta
    const getLogSummary = (meta: any) => {
        if (!meta) return null;
        if (meta.email || meta.user?.email) {
            return (
                <div className="flex items-center gap-2 text-slate-400">
                    <User className="w-3.5 h-3.5 text-primary-400" />
                    <span className="truncate max-w-[150px] font-mono text-xs">{meta.email || meta.user?.email}</span>
                </div>
            );
        }
        if (meta.url) {
            return (
                <div className="flex items-center gap-2 text-slate-400">
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="truncate max-w-[150px] font-mono text-xs">{meta.method} {meta.url}</span>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-300 p-6 relative font-sans selection:bg-primary-500/30">
            {/* Background glowing effects for futuristic vibe */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-[1500px] mx-auto space-y-6 relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3 font-mono tracking-tight">
                            <Terminal className="text-primary-400 w-6 h-6" />
                            SYS_AUDIT_LOGS
                            <span className="flex h-2 w-2 relative ml-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                            </span>
                        </h1>
                        <p className="text-slate-500 text-sm mt-1 font-mono">CONNECTION ESTABLISHED. MONITORING SECURE CHANNELS.</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchLogs}
                            className="px-4 py-2 bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-all flex items-center gap-2 text-sm font-medium shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-md"
                            title="Refresh logs"
                        >
                            <RefreshCw className={cn("w-4 h-4 text-primary-400", loading && "animate-spin")} />
                            Sync Data
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-lg flex flex-col md:flex-row gap-3 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Query logs by pattern..."
                            className="w-full pl-9 pr-4 py-2 bg-[#0B1121] border border-slate-700 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-slate-200 placeholder:text-slate-600 font-mono shadow-inner"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Filter className="w-4 h-4 text-slate-500 hidden md:block" />
                        <select
                            className="bg-[#0B1121] border border-slate-700 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm py-2 px-3 cursor-pointer w-full text-slate-300 font-mono shadow-inner"
                            value={levelFilter}
                            onChange={(e) => setLevelFilter(e.target.value)}
                        >
                            <option value="all">ALL_LEVELS</option>
                            <option value="error">ERROR_ONLY</option>
                            <option value="warn">WARN_ONLY</option>
                            <option value="info">INFO_ONLY</option>
                        </select>
                    </div>
                </div>

                {/* Main Content Area: Table + Slideover */}
                <div className="flex gap-4 relative">

                    {/* Logs Table */}
                    <div className={cn(
                        "bg-[#0B1121]/90 border border-slate-800 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-300 flex-1",
                        selectedLog ? "hidden lg:block lg:w-2/3" : "w-full"
                    )}>
                        {/* Fixed Height Scrollable Table Container */}
                        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)] custom-scrollbar">
                            <table className="w-full text-left text-sm border-collapse relative">
                                <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md shadow-sm border-b border-slate-800 font-mono text-xs uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-5 py-4 font-semibold w-36">Timestamp</th>
                                        <th className="px-5 py-4 font-semibold w-24">Lvl</th>
                                        <th className="px-5 py-4 font-semibold">Message/Payload</th>
                                        <th className="px-5 py-4 font-semibold w-56 hidden sm:table-cell">Context</th>
                                        <th className="px-3 py-4 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-5 py-24 text-center">
                                                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-4 text-primary-500" />
                                                <span className="font-mono text-sm text-slate-500">Fetching system telemetry...</span>
                                            </td>
                                        </tr>
                                    ) : filteredLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-5 py-24 text-center">
                                                <Terminal className="w-8 h-8 mx-auto mb-4 text-slate-700" />
                                                <span className="font-mono text-sm text-slate-500">No telemetry data matching current matrix.</span>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLogs.map((log) => (
                                            <tr
                                                key={log.id}
                                                onClick={() => setSelectedLog(log)}
                                                className={cn(
                                                    "group cursor-pointer transition-colors border-l-2",
                                                    selectedLog?.id === log.id
                                                        ? "bg-primary-900/10 border-primary-500"
                                                        : "border-transparent hover:bg-slate-800/40 hover:border-slate-600"
                                                )}
                                            >
                                                <td className="px-5 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                                                    {new Date(log.timestamp).toLocaleString('en-US', {
                                                        month: 'short', day: '2-digit',
                                                        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                                                    })}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-[10px] font-mono border",
                                                        getLevelColor(log.level)
                                                    )}>
                                                        {log.level}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 font-medium text-slate-200 truncate max-w-[200px] sm:max-w-[400px]">
                                                    {log.message}
                                                </td>
                                                <td className="px-5 py-3 hidden sm:table-cell">
                                                    {getLogSummary(log.meta)}
                                                </td>
                                                <td className="px-3 py-3 text-right">
                                                    <ChevronRight className={cn(
                                                        "w-4 h-4 transition-transform",
                                                        selectedLog?.id === log.id ? "text-primary-400 translate-x-1" : "text-slate-600 group-hover:text-slate-400"
                                                    )} />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Table Footer / Status */}
                        <div className="border-t border-slate-800 bg-slate-900/50 px-5 py-3 flex items-center justify-between font-mono text-xs">
                            <p className="text-slate-500">
                                ACTIVE_STREAM: {filteredLogs.length} REC
                            </p>
                            <div className="flex items-center gap-2 text-emerald-500/80">
                                <Shield className="w-3.5 h-3.5" />
                                DEFLECT_WINSTON_CORE
                            </div>
                        </div>
                    </div>

                    {/* Slide-over Panel for Log Details */}
                    <AnimatePresence>
                        {selectedLog && (
                            <motion.div
                                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                className="bg-[#0B1121] border border-slate-700 rounded-xl shadow-[-15px_0_30px_rgba(0,0,0,0.8)] flex-col overflow-hidden w-full lg:w-1/3 flex absolute inset-0 lg:relative z-20"
                            >
                                {/* Panel Header */}
                                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <span className={cn(
                                            "px-2 py-1 rounded text-[10px] font-mono border shadow-sm",
                                            getLevelColor(selectedLog.level)
                                        )}>
                                            {selectedLog.level}
                                        </span>
                                        <h3 className="font-mono font-semibold text-slate-200 text-sm tracking-tight">LOG_INSPECT</h3>
                                    </div>
                                    <button
                                        onClick={() => setSelectedLog(null)}
                                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Panel Body */}
                                <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                                    {/* Message Block */}
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-slate-500 font-mono tracking-widest flex items-center gap-2">
                                            <span className="w-2 h-[1px] bg-slate-600"></span>
                                            PAYLOAD
                                        </p>
                                        <p className="text-sm font-medium text-slate-300 bg-slate-900/50 p-3 rounded border border-slate-800/50">
                                            {selectedLog.message}
                                        </p>
                                    </div>

                                    {/* Timestamp Block */}
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-slate-500 font-mono tracking-widest flex items-center gap-2">
                                            <span className="w-2 h-[1px] bg-slate-600"></span>
                                            SYS_TIME
                                        </p>
                                        <p className="text-xs text-primary-400 font-mono bg-slate-900/50 p-2 inset-shadow-sm rounded border border-slate-800/50 inline-block">
                                            {new Date(selectedLog.timestamp).toISOString()}
                                        </p>
                                    </div>

                                    {/* Metadata JSON Block */}
                                    {selectedLog.meta && Object.keys(selectedLog.meta).length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold text-slate-500 font-mono tracking-widest flex items-center gap-2">
                                                <span className="w-2 h-[1px] bg-slate-600"></span>
                                                RAW_META_DUMP
                                            </p>
                                            <div className="bg-[#050505] rounded-lg p-4 overflow-x-auto shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] border border-slate-800/80">
                                                <pre className="text-[11px] leading-relaxed font-mono text-emerald-400">
                                                    {JSON.stringify(selectedLog.meta, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </div>
        </div>
    );
}
