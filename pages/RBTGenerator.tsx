import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import * as XLSX from 'xlsx';
import ClientSelector from '../components/ClientSelector';
import { authApi } from '../lib/api';

interface InputRow {
    id: number;
    name: string;
    total: number;
    days: number;
}

interface ResultRow extends InputRow {
    data: number[];
}

interface Client {
    id: string;
    first_name: string;
    last_name: string;
}

interface GeneratedNote {
    id: string;
    created_at: string;
    client_id: string | null;
    input_data: InputRow[];
    output_data: ResultRow[];
    module_type: string;
    clients?: { first_name: string; last_name: string };
}

const RBTGenerator = () => {
    const { t } = useLanguage();
    const { user, loading } = useUser();

    // UI State
    const [activeTab, setActiveTab] = useState<'generator' | 'history'>('generator');

    // Generator State
    const [inputs, setInputs] = useState<InputRow[]>([{ id: 1, name: '', total: 0, days: 5 }]);
    const [results, setResults] = useState<ResultRow[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string>(''); // Stores client ID
    const [clientName, setClientName] = useState('');
    const [modules, setModules] = useState([
        { id: 1, name: 'Maladaptive Behavior Reduction', type: 'reduction', data: { frequency: '', duration: '' } },
        { id: 2, name: 'Skill Acquisition', type: 'acquisition', data: { trials: '', correct: '' } }
    ]);
    const [sessionSummary, setSessionSummary] = useState('');
    const [nextSessionPlan, setNextSessionPlan] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);
    const [presets, setPresets] = useState<{ id: string; name: string; config: InputRow[] }[]>([]);
    const [showPresets, setShowPresets] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');

    const [searchParams] = useSearchParams();
    const urlClientId = searchParams.get('client_id');
    const [isClientLocked, setIsClientLocked] = useState(false);

    useEffect(() => {
        if (urlClientId && clients.length > 0) {
            setSelectedClientId(urlClientId);
            setIsClientLocked(true);
        }
    }, [urlClientId, clients]);

    // History State
    const [history, setHistory] = useState<GeneratedNote[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);



    const { success, error: showError } = useToast();
    const { confirm, showAlert } = useConfirm();

    // Fetch Presets and Clients on Mount
    useEffect(() => {
        if (!user) return;
        // ... (fetch logic remains same)
        const fetchClients = async () => {
            try {
                const response = await authApi.getClients();
                if (response.ok) {
                    const data = await response.json();
                    setClients(data);
                } else {
                    console.error("Error fetching clients: API returned error");
                }
            } catch (error) {
                console.error("Error fetching clients:", error);
            }
        };

        const fetchPresets = async () => {
            const { data, error } = await supabase
                .from('presets')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (data) setPresets(data);
            if (error) console.error("Error fetching presets:", error);
        };

        fetchClients();
        fetchPresets();
    }, [user]);

    // Load from SessionStorage on Mount
    useEffect(() => {
        if (isGenerating) return;

        const savedSession = sessionStorage.getItem('rbt_session_state');
        if (savedSession) {
            try {
                const parsed = JSON.parse(savedSession);
                if (user && parsed.userId === user.id) {
                    if (parsed.inputs) setInputs(parsed.inputs);
                    if (parsed.results) setResults(parsed.results);
                    if (parsed.selectedClientId) setSelectedClientId(parsed.selectedClientId);
                } else {
                    sessionStorage.removeItem('rbt_session_state');
                }
            } catch (e) {
                console.error("Failed to load session state", e);
            }
        }
        setIsLoaded(true);
    }, [user, loading]);

    // Save to SessionStorage on Change
    useEffect(() => {
        if (!isLoaded || !user) return;
        const stateToSave = {
            userId: user.id,
            inputs,
            results,
            selectedClientId
        };
        sessionStorage.setItem('rbt_session_state', JSON.stringify(stateToSave));
    }, [inputs, results, selectedClientId, isLoaded, user]);

    // Clear Session on Logout
    useEffect(() => {
        if (!loading && !user) {
            sessionStorage.removeItem('rbt_session_state');
        }
    }, [user, loading]);

    // Fetch History
    useEffect(() => {
        if (activeTab === 'history' && user) fetchHistory();
    }, [activeTab, user]);

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const { authApi } = await import('../lib/api');
            const response = await authApi.fetchGenerationHistory('RBT');
            if (response.ok) {
                const json = await response.json();
                if (json.success) {
                    setHistory(json.data);
                }
            } else {
                console.error("Error fetching history");
            }
        } catch (e) {
            console.error(e);
        }
        setLoadingHistory(false);
    };

    const deleteHistoryItem = async (id: string) => {
        const isConfirmed = await confirm({
            title: 'Delete History',
            message: 'Are you sure you want to permanently delete this history item?',
            confirmText: 'Delete',
            type: 'danger'
        });

        if (!isConfirmed) return;

        try {
            const { authApi } = await import('../lib/api');
            const response = await authApi.deleteGenerationHistory(id);
            if (response.ok) {
                setHistory(prev => prev.filter(h => h.id !== id));
                await showAlert('Success', 'History item deleted.', 'success');
            } else {
                await showAlert('Error', 'Error deleting history.', 'danger');
            }
        } catch (e) {
            await showAlert('Error', 'Error deleting history.', 'danger');
        }
    };

    const handleSave = async () => {
        if (!user) return;
        if (results.length === 0) {
            showError('Generate data before saving.');
            return;
        }
        setSaving(true);
        try {
            const { authApi } = await import('../lib/api');
            const historyPayload = {
                module_type: 'RBT',
                client_id: selectedClientId || null,
                input_data: inputs,
                output_data: results
            };

            const response = await authApi.saveGenerationHistory(historyPayload);
            if (response.ok) {
                await showAlert('Success', 'Saved successfully!', 'success');
                setActiveTab('history');
                fetchHistory();
            } else {
                await showAlert('Error', 'Failed to save.', 'danger');
            }
        } catch (e) {
            await showAlert('Error', 'Failed to save.', 'danger');
        } finally {
            setSaving(false);
        }
    };

    const savePreset = async () => {
        if (!newPresetName.trim()) {
            showError('Please enter a name for the preset.');
            return;
        }

        setSaving(true); // Use the common saving state
        try {
            const { data, error } = await supabase
                .from('presets')
                .insert({
                    user_id: user?.id,
                    name: newPresetName,
                    config: inputs
                })
                .select()
                .single();

            if (error) throw error;

            setPresets([data, ...presets]);
            success('Preset saved!');
            setNewPresetName('');
            setShowPresets(false);
        } catch (error) {
            console.error('Error saving preset:', error);
            showError('Failed to save preset.');
        } finally {
            setSaving(false); // Use the common saving state
        }
    };

    const loadPreset = (preset: { config: InputRow[] }) => {
        setInputs(preset.config);
        success('Preset loaded!');
        setShowPresets(false);
    };

    const deletePreset = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const confirmed = await confirm({
            title: 'Delete Preset',
            message: 'Are you sure you want to delete this preset?',
            confirmText: 'Delete',
            type: 'danger'
        });

        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('presets')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setPresets(presets.filter(p => p.id !== id));
            success('Preset deleted.');
        } catch (error) {
            console.error('Error deleting preset:', error);
            showError('Failed to delete preset.');
        }
    };

    // --- Algorithm Logic (Backtracking V2) ---
    const generateDistribution = (total: number, days: number) => {
        if (days <= 0) return [];

        // Safety Fallback for 1 day
        if (days === 1) return [total];

        let result: number[] | null = null;
        let iterations = 0;
        const MAX_ITERATIONS = 50000;

        const isPossible = (currentVal: number, currentSum: number, remDays: number) => {
            const needed = total - currentSum;
            const avgNeeded = needed / remDays;
            const diff = Math.abs(avgNeeded - currentVal);
            return diff <= (4 * remDays);
        };

        const backtrack = (path: number[], currentSum: number) => {
            if (result) return; // Found
            iterations++;
            if (iterations > MAX_ITERATIONS) return;

            if (path.length === days) {
                if (currentSum === total) {
                    result = [...path];
                }
                return;
            }

            const remDays = days - path.length;

            // Pruning
            if (path.length > 0) {
                if (!isPossible(path[path.length - 1], currentSum, remDays)) return;
            }

            // Determine candidates
            let candidates: number[] = [];
            if (path.length === 0) {
                const avg = Math.floor(total / days);
                const range = Math.min(avg, 20);
                for (let i = Math.max(0, avg - range); i <= avg + range; i++) {
                    candidates.push(i);
                }
                candidates.sort((a, b) => Math.abs(a - avg) - Math.abs(b - avg));
            } else {
                const prev = path[path.length - 1];
                const jumps = [-4, -3, -2, 0, 2, 3, 4];
                candidates = jumps.map(j => prev + j).filter(v => v >= 0);

                candidates.sort((a, b) => {
                    const aExists = path.includes(a);
                    const bExists = path.includes(b);
                    if (aExists && !bExists) return 1;
                    if (!aExists && bExists) return -1;
                    return Math.random() - 0.5;
                });
            }

            for (const cand of candidates) {
                const newSum = currentSum + cand;
                if (newSum + (remDays - 1) * 0 > total) continue;

                path.push(cand);
                backtrack(path, newSum);
                if (result) return;
                path.pop();
            }
        };

        backtrack([], 0);

        if (result) return result;

        // Fallback: Linear Distribution
        console.warn('RBT Generator: Backtracking limit reached, using fallback.');
        const fallback = [];
        let remainder = total;
        for (let i = 0; i < days; i++) {
            const val = Math.round(remainder / (days - i));
            fallback.push(val);
            remainder -= val;
        }
        // Shuffle
        for (let i = fallback.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [fallback[i], fallback[j]] = [fallback[j], fallback[i]];
        }
        return fallback;
    };

    // --- UI Handlers ---

    const addRow = () => {
        const newId = inputs.length > 0 ? Math.max(...inputs.map(i => i.id)) + 1 : 1;
        setInputs([...inputs, { id: newId, name: '', total: 0, days: 5 }]);
    };

    const removeRow = (id: number) => {
        setInputs(inputs.filter(row => row.id !== id));
    };

    const removeResultRow = async (index: number) => {
        const confirmed = await confirm({
            title: t('delete_confirm') || 'Confirm Deletion',
            message: 'Remove this row from results?',
            confirmText: 'Remove',
            type: 'warning'
        });

        if (!confirmed) return;

        const newResults = [...results];
        newResults.splice(index, 1);
        setResults(newResults);
        success('Row removed.');
    };

    const updateInput = (id: number, field: keyof InputRow, value: string | number) => {
        setInputs(inputs.map(row => {
            if (row.id === id) {
                return { ...row, [field]: field === 'name' ? value : Number(value) || 0 };
            }
            return row;
        }));
    };

    const handleGenerate = () => {
        const newResults = inputs.map(input => ({
            ...input,
            data: generateDistribution(input.total, input.days)
        }));
        setResults(newResults);
        setCopied(false);
        success('Generated realistic distribution data.', 2000);
    };

    const handleCopy = (resToCopy = results) => {
        if (resToCopy.length === 0) return;
        let text = `| Behavior | ${resToCopy[0].data.map((_, i) => `Day ${i + 1}`).join(' | ')} | Total |\n`;
        text += `|---|${resToCopy[0].data.map(() => '---').join('|')}|---|\n`;
        resToCopy.forEach(row => {
            text += `| ${row.name || 'Unnamed'} | ${row.data.join(' | ')} | ${row.total} |\n`;
        });
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        success('Table copied to clipboard!');
    };

    const exportExcel = () => {
        if (results.length === 0) {
            showError('No data to export.');
            return;
        }

        const maxDays = Math.max(...results.map(r => r.data.length));
        const header = ["Behavior", ...Array.from({ length: maxDays }, (_, i) => `Day ${i + 1}`), "Total"];

        const excelData = [header];
        results.forEach(row => {
            excelData.push([
                row.name || 'Unnamed',
                ...row.data,
                row.total
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "RBT_Data");
        XLSX.writeFile(wb, `RBT_Data_Export.xlsx`);
        success('Excel file exported!');
    };

    const clearAll = async () => {
        const isConfirmed = await confirm({
            title: 'Clear Data',
            message: 'Are you sure you want to clear all rows?',
            confirmText: 'Clear',
            type: 'danger'
        });
        if (isConfirmed) {
            setInputs([{ id: 1, name: '', total: 0, days: 5 }]);
            setResults([]);
        }
    };

    return (
        <Layout>
            <AnimatePresence mode="wait">
                {/* ===== HEADER (BCBA-Matched) ===== */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
                            <span className="material-symbols-outlined text-secondary text-4xl">ssid_chart</span>
                            {t('rbtGenerator')}
                        </h1>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={exportExcel}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg shadow-lg shadow-green-500/20 transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">download</span>
                            Export Excel
                        </button>
                        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
                            {['generator', 'history'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === tab ? 'bg-white dark:bg-neutral-700 text-secondary shadow-sm' : 'text-neutral-500'}`}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {activeTab === 'generator' ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 gap-6"
                    >
                        {/* Client Selector */}
                        <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm flex flex-col md:flex-row gap-6 items-end">
                            <div className={`mb-6 ${isClientLocked ? 'pointer-events-none opacity-80' : ''}`}>
                                <label className="block text-sm font-medium text-neutral-400 mb-2">Select Client</label>
                                <ClientSelector clients={clients} onSelect={setSelectedClientId} selectedClientId={selectedClientId} />
                                {isClientLocked && (
                                    <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">lock</span>
                                        Client locked by profile
                                    </p>
                                )}
                            </div>
                            <div className="bg-neutral-50 dark:bg-neutral-900 px-4 py-2 rounded-xl border border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500 italic max-w-xs">
                                Linking data to a client allows you to track their progress in the Caseload Manager.
                            </div>
                        </div>
                        <motion.div
                            key="generator"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col gap-6"
                        >
                            {/* ===== CONFIG BLOCK (BCBA-Matched) ===== */}
                            <div className="bg-white dark:bg-surface-dark rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                        <span className="size-3 rounded-full bg-secondary"></span>
                                        {t('behavior_name')}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {/* Client Select */}
                                        <select
                                            value={selectedClientId}
                                            onChange={(e) => setSelectedClientId(e.target.value)}
                                            className="h-10 px-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-secondary outline-none"
                                        >
                                            <option value="">-- Client (Optional) --</option>
                                            {clients.map(client => (
                                                <option key={client.id} value={client.id}>
                                                    {client.first_name} {client.last_name}
                                                </option>
                                            ))}
                                        </select>
                                        {/* Presets Button */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowPresets(!showPresets)}
                                                className="px-4 py-2 rounded-lg text-sm font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex items-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-sm">tune</span>
                                                Presets
                                            </button>

                                            {/* Preset Dropdown */}
                                            <AnimatePresence>
                                                {showPresets && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        className="absolute top-12 right-0 w-80 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 z-50 p-4"
                                                    >
                                                        <h4 className="font-bold text-neutral-900 dark:text-white mb-3 text-sm">Saved Configurations</h4>

                                                        <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
                                                            {presets.length === 0 ? (
                                                                <p className="text-xs text-neutral-400 text-center py-4">No saved presets yet.</p>
                                                            ) : (
                                                                presets.map(preset => (
                                                                    <div key={preset.id} className="flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-lg group cursor-pointer" onClick={() => loadPreset(preset)}>
                                                                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[180px]">{preset.name}</span>
                                                                        <button
                                                                            onClick={(e) => deletePreset(preset.id, e)}
                                                                            className="text-neutral-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                                                                        >
                                                                            <span className="material-symbols-outlined text-sm">delete</span>
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>

                                                        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={newPresetName}
                                                                onChange={(e) => setNewPresetName(e.target.value)}
                                                                placeholder="New preset name..."
                                                                className="flex-1 bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-secondary/50"
                                                            />
                                                            <button
                                                                onClick={savePreset}
                                                                disabled={!newPresetName.trim() || saving}
                                                                className="bg-secondary text-white rounded-lg px-3 py-2 text-xs font-bold hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                Save
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>

                                {/* Grid Header */}
                                <div className="space-y-3">
                                    <div className="grid grid-cols-12 gap-4 text-xs font-bold text-neutral-500 uppercase px-3">
                                        <div className="col-span-1 text-center">#</div>
                                        <div className="col-span-5">{t('behavior_name')}</div>
                                        <div className="col-span-2">{t('total_count')}</div>
                                        <div className="col-span-2">{t('days')}</div>
                                        <div className="col-span-2">Act.</div>
                                    </div>
                                    {inputs.length === 0 ? (
                                        <div className="text-center py-8 text-neutral-400 border-2 border-dashed border-neutral-100 dark:border-neutral-800 rounded-xl">
                                            No behaviors added yet. Click "+ Add Row" to begin.
                                        </div>
                                    ) : (
                                        inputs.map((row, idx) => (
                                            <div key={row.id} className="grid grid-cols-12 gap-4 items-center">
                                                <div className="col-span-1 text-center font-mono text-neutral-400">{idx + 1}</div>
                                                <div className="col-span-5">
                                                    <input
                                                        type="text"
                                                        value={row.name}
                                                        onChange={(e) => updateInput(row.id, 'name', e.target.value)}
                                                        className="w-full h-10 px-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-secondary outline-none"
                                                        placeholder="e.g. Elopement"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <input
                                                        type="number"
                                                        value={row.total}
                                                        onChange={(e) => updateInput(row.id, 'total', e.target.value)}
                                                        className="w-full h-10 px-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-center font-mono"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="31"
                                                        value={row.days}
                                                        onChange={(e) => updateInput(row.id, 'days', e.target.value)}
                                                        className="w-full h-10 px-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-center font-mono"
                                                    />
                                                </div>
                                                <div className="col-span-2 flex gap-1">
                                                    <button onClick={() => removeRow(row.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Remove">
                                                        <span className="material-symbols-outlined">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Action Buttons (BCBA-Matched) */}
                                <div className="mt-6 flex flex-col md:flex-row gap-3">
                                    <button onClick={addRow} className="px-6 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold rounded-lg hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-sm">add</span>
                                        Add Row
                                    </button>
                                    <button onClick={handleGenerate} className="flex-1 px-4 py-2 font-bold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 bg-secondary text-neutral-900 shadow-secondary/20">
                                        <span className="material-symbols-outlined">auto_awesome</span>
                                        GENERATE ALL
                                    </button>
                                    <button onClick={clearAll} className="px-6 py-2 bg-red-50 dark:bg-red-900/10 text-red-500 font-bold rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-sm">clear_all</span>
                                        Clear All
                                    </button>
                                </div>
                            </div>

                            {/* ===== RESULTS (BCBA-Matched) ===== */}
                            {results.length > 0 && results[0].data && (
                                <>
                                    {/* Table */}
                                    <div className="bg-white dark:bg-surface-dark rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                                        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-end gap-2">
                                            <button
                                                onClick={() => handleCopy()}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${copied ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50'}`}
                                            >
                                                <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
                                                {copied ? 'Copied!' : 'Copy Table'}
                                            </button>
                                        </div>
                                        <div className="p-4">
                                            <DataTableView results={results} onDeleteRow={removeResultRow} />
                                        </div>
                                    </div>

                                    {/* Save History Button */}
                                    <div className="flex justify-end gap-3 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl">
                                        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-neutral-800 text-white font-bold rounded-lg hover:bg-neutral-700 disabled:opacity-50">
                                            <span className="material-symbols-outlined">save</span>
                                            {saving ? 'Saving...' : 'Save History'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                ) : (
                    /* ===== HISTORY TAB (BCBA-Matched) ===== */
                    <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
                        <div className="grid gap-4">
                            {loadingHistory ? (
                                <p className="text-center text-neutral-500 py-10">Loading history...</p>
                            ) : history.length === 0 ? (
                                <p className="text-center text-neutral-500 py-10">No history records found.</p>
                            ) : (
                                history.map(h => (
                                    <div key={h.id} className="p-4 bg-white dark:bg-surface-dark border border-neutral-200 dark:border-neutral-800 rounded-xl flex justify-between items-center">
                                        <div>
                                            <h4 className="font-bold flex items-center gap-2">
                                                <span className="material-symbols-outlined text-neutral-400">person</span>
                                                {h.clients?.first_name ? `${h.clients.first_name} ${h.clients.last_name || ''}` : 'Generic Client'}
                                            </h4>
                                            <p className="text-xs text-neutral-500">{new Date(h.created_at).toLocaleDateString()} - {new Date(h.created_at).toLocaleTimeString()}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    if (h.output_data) setResults(h.output_data);
                                                    if (h.input_data) setInputs(h.input_data);
                                                    setActiveTab('generator');
                                                    showAlert('Success', 'Data loaded from history.', 'success');
                                                }}
                                                className="px-3 py-1 bg-secondary/10 text-secondary rounded-lg text-sm font-bold hover:bg-secondary/20 transition-colors"
                                            >
                                                Load
                                            </button>
                                            <button onClick={() => deleteHistoryItem(h.id)} className="px-3 py-1 bg-red-50 text-red-500 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors">
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Layout >
    );
};

// Reusable Table Component (Preserved)
const DataTableView = ({ results, isReadOnly = false, onDeleteRow }: { results: ResultRow[], isReadOnly?: boolean, onDeleteRow?: (index: number) => void }) => {
    return (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700/50 shadow-sm">
            <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-300 border-collapse">
                <thead className="bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 uppercase font-bold text-[10px] tracking-widest">
                    <tr>
                        <th className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 sticky left-0 z-10 bg-neutral-50 dark:bg-neutral-800">Behavior</th>
                        {Array.from({ length: Math.max(...results.map(r => r.data.length)) }).map((_, i) => (
                            <th key={i} className="px-3 py-4 border-b border-neutral-200 dark:border-neutral-700 text-center min-w-[50px]">D{i + 1}</th>
                        ))}
                        <th className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 text-center bg-neutral-100 dark:bg-neutral-800/80 font-black text-neutral-700 dark:text-neutral-300">Total</th>
                        {!isReadOnly && <th className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 text-center">Actions</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                    {results.map((row, idx) => {
                        const maxDays = Math.max(...results.map(r => r.data.length));
                        const total = row.data.reduce((a, b) => a + b, 0);
                        return (
                            <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                                <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white sticky left-0 bg-white dark:bg-neutral-900 border-r border-neutral-100 dark:border-neutral-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] text-left">{row.name || '---'}</td>
                                {Array.from({ length: maxDays }).map((_, i) => {
                                    const val = row.data[i];
                                    if (val === undefined) return <td key={i} className="bg-neutral-50/50 dark:bg-neutral-900"></td>;

                                    let style = "text-neutral-500 dark:text-neutral-400";
                                    let cellBg = "";

                                    // Heatmap Logic
                                    if (i > 0) {
                                        const diff = Math.abs(val - row.data[i - 1]);
                                        if (diff === 1) {
                                            style = "text-secondary font-bold";
                                            cellBg = "bg-yellow-50 dark:bg-yellow-900/10";
                                        }
                                        if (diff > 4) {
                                            style = "text-primary font-bold";
                                            cellBg = "bg-red-50 dark:bg-red-900/20";
                                        }
                                    }

                                    // Duplicate logic
                                    const isDupe = row.data.filter(v => v === val).length > 1;
                                    if (isDupe && !style.includes("text-secondary") && !style.includes("text-primary")) {
                                        style = "text-secondary font-bold";
                                        cellBg = "bg-neutral-50 dark:bg-neutral-900/10";
                                    }

                                    return (
                                        <td key={i} className={`px-2 py-3 text-center font-mono text-xs ${cellBg}`}>
                                            <span className={style}>{val}</span>
                                        </td>
                                    );
                                })}
                                <td className="px-6 py-4 text-center font-black text-secondary bg-neutral-50 dark:bg-neutral-800/50 border-l border-neutral-100 dark:border-neutral-800">{total}</td>
                                {!isReadOnly && (
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => onDeleteRow && onDeleteRow(idx)}
                                            className="size-8 inline-flex items-center justify-center text-neutral-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                            title="Delete Row"
                                        >
                                            <span className="material-symbols-outlined text-base">close</span>
                                        </button>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default RBTGenerator;