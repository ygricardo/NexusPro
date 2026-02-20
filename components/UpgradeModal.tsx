import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
    isOpen,
    onClose,
    title = "Feature Locked",
    description = "This feature is available on higher tier plans. Upgrade your subscription to unlock advanced capabilities."
}) => {
    const navigate = useNavigate();

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden border border-white/20 dark:border-neutral-800"
                    >
                        {/* Decorative Header Background */}
                        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-primary/20 via-purple-500/10 to-transparent pointer-events-none" />

                        <div className="relative p-8 flex flex-col items-center text-center">
                            {/* Icon */}
                            <div className="size-20 rounded-2xl bg-gradient-to-br from-neutral-100 to-white dark:from-neutral-800 dark:to-neutral-900 shadow-lg flex items-center justify-center mb-6 relative group">
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="material-symbols-outlined text-4xl text-neutral-400 dark:text-neutral-500 group-hover:text-primary transition-colors">lock</span>
                                <div className="absolute -top-2 -right-2 size-8 bg-amber-400 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-neutral-900">
                                    <span className="material-symbols-outlined text-sm text-neutral-900 font-bold">star</span>
                                </div>
                            </div>

                            <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">
                                {title}
                            </h3>

                            <p className="text-neutral-500 dark:text-neutral-400 mb-8 leading-relaxed">
                                {description}
                            </p>

                            <div className="w-full space-y-3">
                                <button
                                    onClick={() => {
                                        onClose();
                                        navigate('/plans');
                                    }}
                                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group"
                                >
                                    <span>View Upgrade Plans</span>
                                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </button>

                                <button
                                    onClick={onClose}
                                    className="w-full py-3.5 px-6 rounded-xl bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 font-bold transition-all"
                                >
                                    Maybe Later
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default UpgradeModal;
