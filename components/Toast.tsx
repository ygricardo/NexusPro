import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
    onClose: (id: string) => void;
}

const variants = {
    initial: { opacity: 0, y: 50, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
};

const icons = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
    warning: 'warning'
};

const colors = {
    success: 'bg-secondary text-neutral-900 shadow-secondary/30',
    error: 'bg-danger text-white shadow-danger/30',
    info: 'bg-primary text-white shadow-primary/30',
    warning: 'bg-secondary text-neutral-900 shadow-secondary/30'
};

const Toast: React.FC<ToastProps> = ({ id, message, type, duration = 3000, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, duration);

        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    return (
        <motion.div
            layout
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-md min-w-[300px] max-w-md pointer-events-auto ${colors[type]}`}
        >
            <span className="material-symbols-outlined text-xl shrink-0">
                {icons[type]}
            </span>
            <p className="text-sm font-bold flex-1">{message}</p>
            <button
                onClick={() => onClose(id)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors shrink-0"
            >
                <span className="material-symbols-outlined text-lg">close</span>
            </button>
        </motion.div>
    );
};

export default Toast;
