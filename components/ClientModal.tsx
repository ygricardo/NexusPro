import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '../lib/api';

interface Client {
    id: string;
    first_name: string;
    last_name: string;
    created_at: string;
}

interface ClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    clientToEdit?: Client | null;
}

const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, onSuccess, clientToEdit }) => {
    const [clientForm, setClientForm] = useState<Partial<Client>>({
        first_name: '',
        last_name: ''
    });

    useEffect(() => {
        if (clientToEdit) {
            setClientForm({
                first_name: clientToEdit.first_name,
                last_name: clientToEdit.last_name
            });
        } else {
            setClientForm({
                first_name: '',
                last_name: ''
            });
        }
    }, [clientToEdit, isOpen]);

    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let response;
            if (clientToEdit) {
                response = await authApi.updateClient(clientToEdit.id, clientForm);
            } else {
                response = await authApi.createClient(clientForm);
            }

            if (response.ok) {
                onSuccess();
                onClose();
            } else {
                console.error('Failed to save client');
            }
        } catch (error) {
            console.error('Error saving client:', error);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-surface-dark border border-neutral-800 w-full max-w-lg rounded-2xl p-6 relative z-10 shadow-2xl"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">{clientToEdit ? 'Edit Client' : 'Add New Client'}</h3>
                            <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-2xl">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSaveClient} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">First Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={clientForm.first_name}
                                        onChange={(e) => setClientForm({ ...clientForm, first_name: e.target.value })}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                                        placeholder="John"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">Last Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={clientForm.last_name}
                                        onChange={(e) => setClientForm({ ...clientForm, last_name: e.target.value })}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl mt-4 transition-all shadow-lg shadow-primary/20"
                            >
                                {clientToEdit ? 'Update Client Record' : 'Create Client Record'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ClientModal;
