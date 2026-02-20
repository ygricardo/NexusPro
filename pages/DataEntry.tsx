import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const DataEntry = () => {
    const [seconds, setSeconds] = useState(2712); // start at 00:45:12
    const [isRunning, setIsRunning] = useState(true);

    useEffect(() => {
        let interval: any;
        if (isRunning) {
            interval = setInterval(() => {
                setSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning]);

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="relative flex h-screen w-full flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-900">
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-6 py-3 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <Link to="/" className="size-8 text-primary flex items-center justify-center"><span className="material-symbols-outlined text-3xl">hub</span></Link>
                    <h2 className="text-neutral-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">ABA Nexus</h2>
                </div>
                <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
                    <nav className="flex items-center gap-9">
                        <Link to="/" className="text-neutral-600 dark:text-neutral-300 hover:text-primary text-sm font-medium leading-normal">Dashboard</Link>
                        <span className="text-primary text-sm font-medium leading-normal">Session</span>
                        <Link to="/bcba-dashboard" className="text-neutral-600 dark:text-neutral-300 hover:text-primary text-sm font-medium leading-normal">Reports</Link>
                    </nav>
                    <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 border-2 border-primary/20" style={{ backgroundImage: 'url("https://picsum.photos/200/200?random=1")' }}></div>
                </div>
            </header>
            <div className="bg-white/80 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 shrink-0 z-10 shadow-sm">
                <div className="px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4 min-w-[240px]">
                        <div className="bg-neutral-100 dark:bg-neutral-800 p-2 rounded-lg text-primary"><span className="material-symbols-outlined">person</span></div>
                        <div>
                            <h1 className="text-lg font-bold leading-tight text-neutral-900 dark:text-white">Session: John Doe</h1>
                            <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                                <span>Sup: Jane Smith</span>
                                <span className="w-1 h-1 rounded-full bg-neutral-400"></span>
                                <span className="flex items-center gap-1 text-green-600 dark:text-[#0bda5b]"><span className="material-symbols-outlined text-sm">wifi</span> Excellent</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-2 pr-6 border border-neutral-200 dark:border-neutral-700">
                        <button className="flex items-center justify-center size-10 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"><span className="material-symbols-outlined">stop_circle</span></button>
                        <button onClick={() => setIsRunning(!isRunning)} className={`flex items-center justify-center size-10 rounded-lg ${isRunning ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-green-500/10 text-green-600"} transition-colors`}>
                            <span className="material-symbols-outlined">{isRunning ? "pause" : "play_arrow"}</span>
                        </button>
                        <div className="flex flex-col items-start min-w-[100px]">
                            <span className="text-2xl font-bold tabular-nums leading-none tracking-tight text-neutral-900 dark:text-white">{formatTime(seconds)}</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 dark:text-neutral-400">Session Time</span>
                        </div>
                    </div>
                    <Link to="/session-note" className="flex items-center gap-2 bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors border border-transparent dark:border-neutral-700 shadow-sm">
                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                        <span>End Session</span>
                    </Link>
                </div>
            </div>
            <div className="flex grow overflow-hidden">
                <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-neutral-900 dark:text-white text-lg font-bold">Target Behaviors & Skills</h3>
                        <div className="flex gap-2">
                            <button className="p-2 text-neutral-500 hover:text-primary transition-colors"><span className="material-symbols-outlined">filter_list</span></button>
                            <button className="p-2 text-neutral-500 hover:text-primary transition-colors"><span className="material-symbols-outlined">grid_view</span></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-20">
                        {/* Card 1 */}
                        <div className="flex flex-col rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-surface-dark p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="font-bold text-xl text-neutral-900 dark:text-white">Aggression</h3>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 mt-1 inline-block">Maladaptive</span>
                                </div>
                            </div>
                            <div className="flex items-end justify-between gap-4 mt-auto">
                                <div className="flex flex-col">
                                    <span className="text-5xl font-bold tabular-nums text-neutral-900 dark:text-white">4</span>
                                    <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium">Count / Hour: 2.5</span>
                                </div>
                                <div className="flex gap-3 items-center">
                                    <button className="size-12 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors border border-neutral-200 dark:border-neutral-600"><span className="material-symbols-outlined">remove</span></button>
                                    <button className="size-20 rounded-2xl bg-primary text-white hover:bg-red-700 shadow-lg shadow-primary/30 flex items-center justify-center transition-all active:scale-95"><span className="material-symbols-outlined !text-4xl">add</span></button>
                                </div>
                            </div>
                        </div>
                        {/* Card 2 */}
                        <div className="flex flex-col rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-surface-dark p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-xl text-neutral-900 dark:text-white">On-Task Behavior</h3>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 mt-1 inline-block">Skill Acquisition</span>
                                </div>
                                <div className="size-8 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse"><span className="material-symbols-outlined text-green-500 text-lg">timer</span></div>
                            </div>
                            <div className="flex flex-col items-center justify-center py-4 relative">
                                <div className="relative size-32 flex items-center justify-center rounded-full border-4 border-neutral-100 dark:border-neutral-700">
                                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent border-r-transparent -rotate-45" style={{ clipPath: 'circle(50%)' }}></div>
                                    <span className="text-3xl font-bold tabular-nums text-neutral-900 dark:text-white">04:20</span>
                                </div>
                                <span className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">Current Interval</span>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button className="flex-1 h-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-600">Stop</button>
                                <button className="flex-1 h-12 rounded-lg bg-primary text-white font-medium hover:bg-red-700 shadow-lg shadow-primary/20">Resume</button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default DataEntry;