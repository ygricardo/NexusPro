import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import ConfirmDialog from '../components/ConfirmDialog';

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info' | 'warning' | 'success';
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    showAlert: (title: string, message: string, type?: 'danger' | 'info' | 'warning' | 'success') => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [dialog, setDialog] = useState<ConfirmOptions & { isOpen: boolean; isAlert: boolean; resolve: (value: boolean) => void } | null>(null);

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setDialog({ ...options, isOpen: true, isAlert: false, resolve });
        });
    }, []);

    const showAlert = useCallback((title: string, message: string, type: 'danger' | 'info' | 'warning' | 'success' = 'info') => {
        return new Promise<void>((resolve) => {
            setDialog({
                title,
                message,
                type,
                confirmText: 'OK',
                isOpen: true,
                isAlert: true,
                resolve: () => resolve()
            });
        });
    }, []);

    const handleConfirm = () => {
        if (dialog) {
            dialog.resolve(true);
            setDialog(null);
        }
    };

    const handleCancel = () => {
        if (dialog) {
            dialog.resolve(false);
            setDialog(null);
        }
    };

    return (
        <ConfirmContext.Provider value={{ confirm, showAlert }}>
            {children}
            <AnimatePresence>
                {dialog && dialog.isOpen && (
                    <ConfirmDialog
                        title={dialog.title}
                        message={dialog.message}
                        confirmText={dialog.confirmText}
                        cancelText={dialog.cancelText}
                        type={dialog.type}
                        isAlert={dialog.isAlert}
                        onConfirm={handleConfirm}
                        onCancel={handleCancel}
                    />
                )}
            </AnimatePresence>
        </ConfirmContext.Provider>
    );
};

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (context === undefined) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};
