import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { authApi } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import ClientModal from '../components/ClientModal';

interface Client {
    id: string;
    first_name: string;
    last_name: string;
    created_at: string;
}

interface ClientHistory {
    notes: any[];
    daily: any[];
    weekly: any[];
}

const ClientManager = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tabParam = searchParams.get('tab') || 'daily'; // read ?tab= from URL
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const response = await authApi.getClients();
            if (response.ok) {
                const data = await response.json();
                setClients(data);
                // Refresh selected client checks if updated
                if (selectedClient) {
                    const updated = data.find((c: Client) => c.id === selectedClient.id);
                    if (updated) setSelectedClient(updated);
                }
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSelectedClient(null);
        setIsModalOpen(false);
    };

    const openAddModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const openEditModal = (client: Client) => {
        setSelectedClient(client);
        setIsModalOpen(true);
    };

    const handleSuccess = () => {
        fetchClients();
        resetForm();
    };

    const handleDeleteClient = async (id: string) => {
        if (!confirm('Are you sure you want to delete this client? All history will be permanently lost.')) return;
        try {
            const response = await authApi.deleteClient(id);
            if (response.ok) {
                fetchClients();
                if (selectedClient?.id === id) setSelectedClient(null);
            }
        } catch (error) {
            console.error('Error deleting client:', error);
        }
    };

    const filteredClients = clients.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout>
            <div className="w-full px-4 md:px-8 mx-auto space-y-4 sm:space-y-8 flex flex-col h-[calc(100vh-6rem)]">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-4xl">groups</span>
                            Caseload Management
                        </h1>
                        <p className="text-neutral-400 mt-1">Manage your active clients and clinical history.</p>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20"
                    >
                        <span className="material-symbols-outlined">person_add</span>
                        Add New Client
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
                    {/* Client List - Full Width */}
                    <div className="col-span-12 space-y-4 flex flex-col h-full">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-lg">search</span>
                            <input
                                type="text"
                                placeholder="Search clients..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                            />
                        </div>

                        <div className="bg-surface-dark border border-neutral-800 rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
                            {loading ? (
                                <div className="p-12 text-center text-neutral-500 flex flex-col items-center">
                                    <span className="material-symbols-outlined text-4xl mb-4 animate-spin">progress_activity</span>
                                    Loading caseload directory...
                                </div>
                            ) : filteredClients.length === 0 ? (
                                <div className="p-12 text-center text-neutral-500 flex flex-col items-center">
                                    <span className="material-symbols-outlined text-6xl mb-4 opacity-20">person_off</span>
                                    No clients found matching your search.
                                </div>
                            ) : (
                                <div className="divide-y divide-neutral-800">
                                    <div className="hidden md:grid grid-cols-12 gap-4 p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider bg-neutral-900/50">
                                        <div className="col-span-4">Client Name</div>
                                        <div className="col-span-3">Status</div>
                                        <div className="col-span-3">Joined Date</div>
                                        <div className="col-span-2 text-right">Actions</div>
                                    </div>
                                    <div className="overflow-y-auto custom-scrollbar flex-1">
                                        {filteredClients.map(client => (
                                            <div
                                                key={client.id}
                                                onClick={() => navigate(`/clients/${client.id}?tab=${tabParam}`)}
                                                className="group flex flex-col md:grid md:grid-cols-12 gap-4 p-4 hover:bg-white/5 transition-all items-center border-l-4 border-transparent hover:border-primary cursor-pointer"
                                            >
                                                <div className="col-span-4 flex items-center gap-3 w-full">
                                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                                                        {client.first_name[0]}{client.last_name[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white text-lg">{client.first_name} {client.last_name}</div>
                                                        <div className="text-xs text-neutral-500 md:hidden">Since {new Date(client.created_at).toLocaleDateString()}</div>
                                                    </div>
                                                </div>

                                                <div className="col-span-3 w-full flex items-center">
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                        Active
                                                    </span>
                                                </div>

                                                <div className="col-span-3 w-full text-sm text-neutral-400 hidden md:block">
                                                    {new Date(client.created_at).toLocaleDateString()}
                                                </div>

                                                <div className="col-span-2 w-full flex justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/clients/${client.id}?tab=${tabParam}`);
                                                        }}
                                                        className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-all"
                                                        title="View Profile"
                                                    >
                                                        <span className="material-symbols-outlined">visibility</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openEditModal(client);
                                                        }}
                                                        className="p-2 bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-all"
                                                        title="Edit Details"
                                                    >
                                                        <span className="material-symbols-outlined">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteClient(client.id);
                                                        }}
                                                        className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                                                        title="Delete Record"
                                                    >
                                                        <span className="material-symbols-outlined">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Client Modal */}
            <ClientModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleSuccess}
                clientToEdit={selectedClient}
            />
        </Layout>
    );
};

export default ClientManager;
