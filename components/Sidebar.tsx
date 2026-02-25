import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';
import { UserPlan } from '../types';
import UpgradeModal from './UpgradeModal'; // Import UpgradeModal

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

// Define Menu Interface
interface MenuItem {
    to: string;
    icon: string;
    labelKey: string;
    allowedPlans?: UserPlan[];
    moduleId?: string;
    adminOnly?: boolean;
    roles?: string[]; // New: Filter by specific user roles
}

// Menu Configuration (Restructured)
const MENU_ITEMS: MenuItem[] = [
    {
        to: '/',
        icon: 'dashboard',
        labelKey: 'dashboard'
    },
    {
        to: '/caseload',
        icon: 'groups',
        labelKey: 'clients'
    },
    {
        to: '/plans',
        icon: 'card_membership',
        labelKey: 'membership'
    },
    // Admin Only Links
    {
        to: '/admin',
        icon: 'admin_panel_settings',
        labelKey: 'admin',
        adminOnly: true
    },
    {
        to: '/admin-logs',
        icon: 'terminal',
        labelKey: 'logs',
        adminOnly: true
    }
];

const NavButton = ({
    to,
    icon,
    label,
    isCollapsed,
    isActive,
    locked,
    onLockedClick
}: {
    to: string;
    icon: string;
    label: string;
    isCollapsed: boolean;
    isActive: boolean;
    locked?: boolean;
    onLockedClick?: () => void;
}) => {
    const handleClick = (e: React.MouseEvent) => {
        if (locked) {
            e.preventDefault();
            onLockedClick?.();
        }
    };

    return (
        <NavLink
            to={to}
            onClick={handleClick}
            className={cn(
                "block w-full outline-none group",
                locked && "cursor-not-allowed opacity-70"
            )}
        >
            <div
                className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-300 relative z-10 overflow-hidden",
                    isActive && !locked
                        ? "text-white bg-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-primary/30"
                        : "text-blue-200/60 hover:text-white hover:bg-white/5",
                    isCollapsed && "justify-center px-0",
                    locked && "hover:bg-transparent hover:text-blue-200/40"
                )}
            >
                {/* Active Indicator Line */}
                {isActive && !locked && (
                    <motion.div
                        layoutId="activeTab"
                        className="absolute left-0 w-1 h-1/2 rounded-r-full bg-cyan-400 shadow-[0_0_10px_2px_rgba(34,211,238,0.8)]"
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                )}

                <div className="relative z-20 flex items-center justify-center">
                    <span className={cn(
                        "material-symbols-outlined text-[22px] transition-colors",
                        isActive && !locked ? "text-cyan-300 drop-shadow-md" : "group-hover:text-cyan-300",
                        locked && "text-neutral-500 group-hover:text-neutral-500"
                    )}>
                        {icon}
                    </span>
                    {locked && (
                        <span className="material-symbols-outlined text-[10px] absolute -top-1 -right-2 text-amber-400 drop-shadow-sm">lock</span>
                    )}
                </div>

                {!isCollapsed && (
                    <span className="font-bold tracking-wide text-sm relative z-20 whitespace-nowrap flex items-center gap-2">
                        {label}
                    </span>
                )}
            </div>

            {/* Collapsed Tooltip */}
            {isCollapsed && (
                <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-midnight/90 backdrop-blur-md text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap border border-white/10 shadow-lg z-50">
                    {label} {locked && "(Locked)"}
                </div>
            )}
        </NavLink>
    );
};

const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { pathname } = useLocation();
    const { user, signOut, checkAccess } = useUser();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    // Enhanced Menu Logic with Locking
    const displayItems = MENU_ITEMS.map(item => {
        // 1. Admin Only Check - Hide completely if not admin
        if (item.adminOnly && user?.role !== 'admin') return null;

        // 2. Role Check - Hide completely if role doesn't match
        if (item.roles && user && !item.roles.includes(user.role)) return null;

        // 3. Plan/Module Check - Lock if no access
        let isLocked = false;
        if (item.allowedPlans) {
            isLocked = !checkAccess(item.allowedPlans, item.adminOnly || false, item.moduleId);
        }

        return { ...item, locked: isLocked };
    }).filter(Boolean) as (MenuItem & { locked: boolean })[];

    return (
        <>
            {/* Upgrade Modal */}
            <UpgradeModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
            />

            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setIsOpen(false)}
            />

            <aside
                className={cn(
                    "fixed md:sticky top-0 left-0 h-screen z-50 flex flex-col transition-all duration-300 ease-spring",
                    "glass border-r border-white/5", // Glassmorphism
                    isCollapsed ? "w-[88px]" : "w-72",
                    isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                {/* Logo Section */}
                <div className="h-24 flex items-center justify-between px-6 shrink-0 relative">
                    <div className={cn("flex items-center gap-3 overflow-hidden transition-all", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
                        <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-primary to-cyan-400 shadow-lg shadow-primary/20 shrink-0">
                            <span className="material-symbols-outlined text-white text-[24px]">hub</span>
                        </div>
                        <h1 className="text-xl font-black tracking-tighter text-white">
                            Nexus<span className="text-cyan-400">Pro</span>
                        </h1>
                    </div>

                    {/* Collapse Button */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={cn(
                            "flex items-center justify-center size-8 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all border border-transparent hover:border-white/10 absolute right-4 md:right-[-16px] md:top-8 md:bg-midnight md:border-white/10 md:shadow-[0_0_15px_rgba(0,0,0,0.5)] z-50",
                            isCollapsed && "rotate-180 right-1/2 translate-x-1/2 md:right-1/2"
                        )}
                    >
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                </div>

                {/* Separator gradient */}
                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-4 space-y-2 no-scrollbar">
                    {displayItems.map((item) => (
                        <NavButton
                            key={item.to}
                            to={item.to}
                            icon={item.icon}
                            label={item.labelKey === 'plans' ? 'Membership' : t(item.labelKey)}
                            isCollapsed={isCollapsed}
                            isActive={pathname === item.to}
                            locked={item.locked}
                            onLockedClick={() => setIsUpgradeModalOpen(true)}
                        />
                    ))}
                </nav>

                {/* User Profile Section - Refined */}
                <div className="p-4 mt-auto">
                    {user ? (
                        <div className={cn(
                            "rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/5 p-3 flex items-center gap-3 transition-all hover:border-white/10 hover:bg-white/10 group cursor-pointer relative overflow-hidden",
                            isCollapsed ? "justify-center p-2 rounded-xl" : ""
                        )}>
                            {/* Glow effect on hover */}
                            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl rounded-full pointer-events-none" />

                            <div className="relative shrink-0">
                                <div className="size-10 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 border border-white/10 flex items-center justify-center text-white/80 font-bold shadow-inner">
                                    {user.email?.[0].toUpperCase() || 'U'}
                                </div>
                                {/* Status Indicator */}
                                <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 border-2 border-midnight shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            </div>

                            {!isCollapsed && (
                                <div className="flex-1 min-w-0 flex flex-col">
                                    <span className="text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                                        {user.email?.split('@')[0] || 'User'}
                                    </span>
                                    <span className="text-[10px] font-medium text-yellow-500 uppercase tracking-widest bg-yellow-400/10 px-1.5 py-0.5 rounded-md w-fit border border-yellow-400/20 mt-0.5">
                                        {user.role === 'admin' ? 'Admin' : user.plan ? `${user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} Plan` : 'No Plan'}
                                    </span>
                                </div>
                            )}

                            {!isCollapsed && (
                                <button
                                    onClick={() => signOut()}
                                    className="p-2 rounded-lg text-white/30 hover:text-danger hover:bg-danger/10 transition-all ml-auto hover:scale-110"
                                    title="Log Out"
                                >
                                    <span className="material-symbols-outlined text-[20px]">logout</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <NavLink to="/login" className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-2xl bg-secondary text-white hover:bg-secondary/90 transition-all shadow-lg hover:shadow-secondary/20",
                            isCollapsed && "justify-center px-0 bg-transparent text-secondary hover:bg-secondary/10 hover:text-secondary shadow-none"
                        )}>
                            <span className="material-symbols-outlined text-[20px]">login</span>
                            {!isCollapsed && <span className="font-bold text-sm">Sign In</span>}
                        </NavLink>
                    )}

                    {/* Logout Button for Collapsed Mode - Only if user exists */}
                    {isCollapsed && user && (
                        <button
                            onClick={() => signOut()}
                            className="w-full mt-2 flex items-center justify-center p-3 rounded-xl text-white/30 hover:text-danger hover:bg-danger/10 transition-all border border-transparent hover:border-danger/20"
                            title="Log Out"
                        >
                            <span className="material-symbols-outlined text-[20px]">logout</span>
                        </button>
                    )}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;