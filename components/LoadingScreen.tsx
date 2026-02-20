import React from 'react';

const LoadingScreen = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white overflow-hidden">
            {/* Skeleton Background Layer */}
            <div className="absolute inset-0 grid grid-cols-[250px_1fr] h-screen opacity-20 pointer-events-none">
                {/* Skeleton Sidebar */}
                <div className="h-full border-r border-neutral-200 dark:border-neutral-800 p-4 space-y-6">
                    <div className="h-8 w-32 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse"></div>
                    <div className="space-y-4 pt-10">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-10 w-full bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" style={{ animationDelay: `${i * 100}ms` }}></div>
                        ))}
                    </div>
                </div>

                {/* Skeleton Header & Content */}
                <div className="flex flex-col h-full">
                    <div className="h-16 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-8">
                        <div className="h-6 w-48 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse"></div>
                        <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 animate-pulse"></div>
                    </div>
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-32 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" style={{ animationDelay: `${i * 150}ms` }}></div>
                        ))}
                        <div className="col-span-1 lg:col-span-2 h-64 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse mt-4"></div>
                        <div className="col-span-1 lg:col-span-2 h-64 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse mt-4"></div>
                    </div>
                </div>
            </div>

            {/* Central Spinner & Branding */}
            <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="relative h-20 w-20">
                    {/* Ring 1 - Outer Pulse */}
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping"></div>
                    {/* Ring 2 - Spinning Indicator */}
                    <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                    {/* Logo/Icon placeholder in center (optional) */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-2 w-2 bg-primary rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
                    </div>
                </div>

                <div className="text-center">
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider">
                        NEXUSPRO
                    </h2>
                    <p className="text-xs text-neutral-400 mt-2 tracking-widest uppercase animate-pulse">
                        Loading
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
