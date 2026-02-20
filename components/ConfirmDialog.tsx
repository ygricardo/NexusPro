import React from 'react';
import { motion } from 'framer-motion';

interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info' | 'warning' | 'success';
    isAlert?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
};

const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0 }
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger',
    isAlert = false,
    onConfirm,
    onCancel
}) => {

    const colors = {
        danger: {
            icon: 'text-danger bg-danger/10 dark:bg-danger/20',
            button: 'bg-danger hover:bg-danger/90 focus:ring-danger/20'
        },
        warning: {
            icon: 'text-secondary bg-secondary/10 dark:bg-secondary/20',
            button: 'bg-secondary text-neutral-900 hover:bg-secondary/80 focus:ring-secondary/20'
        },
        info: {
            icon: 'text-primary bg-primary/10 dark:bg-primary/20',
            button: 'bg-primary text-white hover:bg-primary/90 focus:ring-primary/20'
        },
        success: {
            icon: 'text-secondary bg-secondary/10 dark:bg-secondary/20',
            button: 'bg-secondary text-neutral-900 hover:bg-secondary/80 focus:ring-secondary/20'
        }
    };

    // Fallback if type is not found (e.g. success was just added)
    const colorSet = colors[type] || colors['info'];
    const iconName = type === 'danger' ? 'warning' : type === 'warning' ? 'error' : type === 'success' ? 'check_circle' : 'info';

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="absolute inset-0 bg-neutral-900/40 dark:bg-neutral-900/80 backdrop-blur-sm"
                onClick={isAlert ? onConfirm : onCancel}
            />

            <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="relative bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
                <div className="p-6">
                    <div className="flex gap-4">
                        <div className={`size-12 rounded-full shrink-0 flex items-center justify-center ${colorSet.icon}`}>
                            <span className="material-symbols-outlined text-2xl">{iconName}</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2 leading-tight">
                                {title}
                            </h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/50 px-6 py-4 flex items-center justify-end gap-3 border-t border-neutral-100 dark:border-neutral-800">
                    {!isAlert && (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg transition-all transform active:scale-95 ${colorSet.button}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ConfirmDialog;
