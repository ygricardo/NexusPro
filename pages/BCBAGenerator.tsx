import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ClientSelector from '../components/ClientSelector';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfirm } from '../contexts/ConfirmContext';
import { useToast } from '../contexts/ToastContext';
import * as XLSX from 'xlsx';
import { authApi } from '../lib/api';

type TabType = 'maladaptives' | 'replacements';

interface DataState {
    maladaptives: Record<string, (number | null)[]>;
    replacements: Record<string, (number | null)[]>;
    mastery?: Record<string, boolean[]>; // Tracks mastery status for highlighting
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
    input_data: { maladaptives: InputRow[], replacements: InputRow[] };
    output_data: DataState;
    note_type: string;
    clients?: { first_name: string; last_name: string };
}

interface InputRow {
    id: number;
    name: string;
    baseline: number;
    weeks: number;
    mastery: string;
}

interface ResultRow {
    week: number;
    value: number;
    isMastery: boolean;
}

interface Preset {
    id: string;
    name: string;
    config: { maladaptives: InputRow[], replacements: InputRow[] };
}

// --- ALGORITHMS (Ported from User Script) ---
const solveBacktracking = (startVal: number, targetVal: number, steps: number, baseline: number, globalStartWeek: number, masteryEnds: number[], type: 'reduction' | 'replacement') => {
    let result: number[] | null = null;

    function backtrack(path: number[], current: number) {
        if (result) return;
        if (path.length === steps) {
            if (current === targetVal) result = [...path];
            return;
        }

        const remaining = steps - path.length - 1;
        let jumps = [1, 2, 3];
        jumps.sort(() => Math.random() - 0.5);

        for (let jump of jumps) {
            for (let dir of [-1, 1]) {
                let next = current + (jump * dir);

                if (next < 1 || next > 100 || next === current) continue;

                if (path.length >= 2) {
                    const prev = current;
                    const anteprev = path[path.length - 2];
                    if (next > prev && prev > anteprev) continue;
                    if (next < prev && prev < anteprev) continue;
                }

                if (Math.abs(next - targetVal) > (remaining * 3)) continue;

                path.push(next);
                backtrack(path, next);
                path.pop();
            }
        }
    }
    backtrack([], startVal);

    if (!result) {
        result = [];
        let temp = startVal;
        for (let i = 1; i <= steps; i++) {
            let ideal = startVal + (targetVal - startVal) * (i / steps);
            temp = Math.max(1, Math.round(ideal + (Math.random() * 2 - 1)));
            result.push(temp);
        }
    }
    return result;
};

// --- REPLACEMENT SKILL (V26 - SPECIFIC PRE-MASTERY DROP) ---
const solveRecursiveReplacement = (start: number, target: number, steps: number, isPlateau: boolean, ceiling: number, history: number[], forceLastBelow: boolean) => {
    let finalResult: number[] | null = null;

    function getWeightedJumps() {
        // Probabilidades: 1(41%), 2(32%), 3(22%), 4(5%)
        let moves = [1, 2, 3, 4];
        let attempts: number[] = [];
        while (attempts.length < 4) {
            let r = Math.random();
            let chosen = 0;
            if (r < 0.05) chosen = 4;
            else if (r < 0.27) chosen = 3;
            else if (r < 0.59) chosen = 2;
            else chosen = 1;

            if (!attempts.includes(chosen)) attempts.push(chosen);
            if (attempts.length < 4 && Math.random() > 0.8) {
                let left = moves.filter(m => !attempts.includes(m)).sort(() => Math.random() - 0.5);
                attempts = attempts.concat(left);
            }
        }
        return attempts;
    }

    function backtrack(path: number[], current: number) {
        if (finalResult) return;

        if (path.length === steps) {
            if (isPlateau) {
                if (path.every(v => v >= target && v <= (target + 4))) finalResult = [...path];
            } else {
                // Ascenso normal: Intentar quedar cerca
                if (current >= (target - 4) && current <= ceiling) {
                    // Doble chequeo de la condición final
                    if (forceLastBelow && current >= target) return;
                    finalResult = [...path];
                }
            }
            return;
        }

        const remaining = steps - path.length;
        if (Math.abs(target - current) > (remaining * 4) + 5) return;

        let jumps = getWeightedJumps();

        for (let jump of jumps) {
            let directions = Math.random() < 0.65 ? [1, -1] : [-1, 1];

            for (let dir of directions) {
                let next = current + (jump * dir);

                // --- REGLAS BASICAS ---
                if (next < 1) continue;
                if (next > 100) continue;
                if (next === current) continue;
                if (next > ceiling) continue;

                // --- REGLA ESPECIFICA (V26): ULTIMA SEMANA ANTES DE MAESTRIA ---
                // Si estamos en la última semana del ascenso (path.length == steps - 1)
                // y 'forceLastBelow' es true, el valor DEBE ser < target.
                if (!isPlateau && forceLastBelow && path.length === (steps - 1)) {
                    if (next >= target) continue;
                }

                // --- REGLA DE NO MAESTRÍA PREMATURA (GENERAL) ---
                // Si no es la última semana, permitimos tocar target pero NO 2 veces seguidas
                if (!isPlateau && next >= target) {
                    let prev = path.length > 0 ? path[path.length - 1] : (history.length > 0 ? history[history.length - 1] : 0);
                    if (prev >= target) continue;
                }

                // --- REGLA CONTEXTO PLATEAU ---
                if (isPlateau) {
                    if (next < target || next > (target + 4)) continue;
                }

                path.push(next);
                backtrack(path, next);
                if (finalResult) return;
                path.pop();
            }
        }
    }

    backtrack([], start);

    // FALLBACK ROBUSTO
    if (!finalResult) {
        finalResult = [];
        let curr = start;
        for (let i = 0; i < steps; i++) {
            let next;
            let dir = Math.random() < 0.65 ? 1 : -1;

            if (!isPlateau && target - curr > 4) dir = 1;

            let jump = Math.floor(Math.random() * 4) + 1;
            next = curr + (dir * jump);

            if (next < 1) next = 1;
            if (next === curr) next = curr + (Math.random() < 0.5 ? 1 : -1);
            if (next < 1) next = 1;

            if (isPlateau) {
                if (curr < target) {
                    let maxPossible = curr + 4;
                    if (maxPossible < target) next = maxPossible;
                    else next = Math.max(target, curr + (Math.random() > 0.5 ? 1 : 2));
                } else {
                    if (next < target) next = target;
                    if (next > target + 4) next = target + 4;
                }
            } else {
                if (next > ceiling) next = ceiling;

                // Premature mastery general check
                if (next >= target) {
                    let l1 = finalResult!.length > 0 ? finalResult![finalResult!.length - 1] : (history.length ? history[history.length - 1] : 0);
                    if (l1 >= target) next = target - 1;
                }
            }

            if (Math.abs(next - curr) > 4) next = curr + (next > curr ? 4 : -4);
            if (next === curr) next = curr + 1;
            if (next < 1) next = 1;

            // --- REGLA ESPECIFICA (V26) FALLBACK ---
            // Si es la última semana de ascenso, forzar hacia abajo
            if (!isPlateau && forceLastBelow && i === (steps - 1)) {
                if (next >= target) {
                    next = target - 1;
                    if (next === curr) next = target - 2; // Evitar repetido
                }
            }

            finalResult!.push(next);
            curr = next;
        }
    }
    return finalResult;


};

const generatePath = (initialBL: number, totalWeeks: number, masteryEnds: number[], type: 'reduction' | 'replacement') => {
    let fullPath: { weekNum: number; value: number; isMastery: boolean; isCycleEnd: boolean }[] = [];
    let currentVal = initialBL;
    let startWeek = 1;
    let milestones = [...masteryEnds];
    if (milestones.length === 0 || milestones[milestones.length - 1] < totalWeeks) milestones.push(totalWeeks);

    let masteryCounter = 0;

    milestones.forEach((milestone) => {
        const steps = milestone - startWeek + 1;
        if (steps <= 0) return;

        const isMastery = masteryEnds.includes(milestone);
        let target;

        if (type === 'reduction') {
            target = isMastery ? Math.max(1, currentVal - 10) : initialBL + (Math.random() > 0.5 ? 1 : -1);
            if (target < 1) target = 1;

            const segment = solveBacktracking(currentVal, target, steps, initialBL, startWeek, masteryEnds, type);
            segment?.forEach((val, i) => {
                const absW = startWeek + i;
                const inM = masteryEnds.some(e => absW <= e && absW > (e - 4));
                fullPath.push({ weekNum: absW, value: val, isMastery: inM, isCycleEnd: absW === milestone });
            });
            currentVal = segment ? segment[segment.length - 1] : currentVal;
        } else {
            // Lógica de Replacement (10 en 10) - V26 Logic
            if (isMastery) {
                masteryCounter++;
                target = masteryCounter * 10;
            } else {
                target = currentVal;
            }
            if (target < 1) target = 1;

            const ceiling = isMastery ? target + 4 : target + 8;

            if (isMastery && steps >= 4) {
                const ascentSteps = steps - 4;
                // FASE 1: ASCENSO (Antes de la maestría)
                if (ascentSteps > 0) {
                    // Pasamos 'forceLastBelow = true' para que la ULTIMA semana sea < target
                    const ascent = solveRecursiveReplacement(currentVal, target, ascentSteps, false, ceiling, fullPath.map(p => p.value), true);
                    ascent?.forEach((val, i) => {
                        const absW = startWeek + i;
                        fullPath.push({ weekNum: absW, value: val, isMastery: false, isCycleEnd: false });
                    });
                    if (ascent) currentVal = ascent[ascent.length - 1];
                }
                // FASE 2: PLATEAU (Maestría)
                // Note: we need to handle if ascent failed or something, but assuming it returns array
                const plateau = solveRecursiveReplacement(currentVal, target, 4, true, target + 4, fullPath.map(p => p.value), false);
                plateau?.forEach((val, i) => {
                    const absW = startWeek + (ascentSteps > 0 ? ascentSteps : 0) + i;
                    fullPath.push({ weekNum: absW, value: val, isMastery: true, isCycleEnd: absW === milestone });
                });
                if (plateau) currentVal = plateau[plateau.length - 1];

            } else {
                // No es hito de maestría (No forzamos la bajada final)
                const segment = solveRecursiveReplacement(currentVal, target, steps, false, ceiling, fullPath.map(p => p.value), false);
                segment?.forEach((val, i) => {
                    const absW = startWeek + i;
                    fullPath.push({ weekNum: absW, value: val, isMastery: false, isCycleEnd: absW === milestone });
                });
                if (segment) currentVal = segment[segment.length - 1];
            }
        }
        startWeek = milestone + 1;
    });
    return fullPath;
};

const BCBAGenerator = () => {
    const { t } = useLanguage();
    const { user, loading } = useUser();
    const { confirm, showAlert } = useConfirm();
    const { success, error: showError } = useToast();
    const navigate = useNavigate();

    // UI State
    const [activeTab, setActiveTab] = useState<'generator' | 'history'>('generator');
    const [currentTab, setCurrentTab] = useState<TabType>('maladaptives');
    const [maxWeeks, setMaxWeeks] = useState(40);

    // Data State
    const [inputs, setInputs] = useState<InputRow[]>([{ id: 1, name: '', baseline: 0, current: 0 }]);
    const [results, setResults] = useState<ResultRow[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [clientName, setClientName] = useState('');
    const [clients, setClients] = useState<Client[]>([]);
    const [saving, setSaving] = useState(false);

    const [data, setData] = useState<DataState>({
        maladaptives: {},
        replacements: {},
        mastery: {}
    });

    const [searchParams] = useSearchParams();
    const urlClientId = searchParams.get('client_id');
    const [isClientLocked, setIsClientLocked] = useState(false);

    useEffect(() => {
        if (urlClientId && clients.length > 0) {
            setSelectedClientId(urlClientId);
            setIsClientLocked(true);
        }
    }, [urlClientId, clients]);

    // Dynamic Input Rows (Separated)
    const [maladaptiveRows, setMaladaptiveRows] = useState<InputRow[]>([]);
    const [replacementRows, setReplacementRows] = useState<InputRow[]>([]);

    const activeRows = currentTab === 'maladaptives' ? maladaptiveRows : replacementRows;
    const setActiveRows = currentTab === 'maladaptives' ? setMaladaptiveRows : setReplacementRows;

    // Presets State
    const [presets, setPresets] = useState<Preset[]>([]);
    const [showPresets, setShowPresets] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');

    // History State
    const [history, setHistory] = useState<GeneratedNote[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from SessionStorage on Mount (with User Check)
    useEffect(() => {
        if (loading) return; // Wait for user to be loaded

        const savedSession = sessionStorage.getItem('bcba_session_state');
        if (savedSession) {
            try {
                const parsed = JSON.parse(savedSession);
                // Verify it belongs to current user
                if (user && parsed.userId === user.id) {
                    if (parsed.maladaptiveRows) setMaladaptiveRows(parsed.maladaptiveRows);
                    if (parsed.replacementRows) setReplacementRows(parsed.replacementRows);
                    if (parsed.data) setData(parsed.data);
                    if (parsed.selectedClientId) setSelectedClientId(parsed.selectedClientId);
                } else {
                    // Stale data or different user -> Clear it
                    sessionStorage.removeItem('bcba_session_state');
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
            maladaptiveRows,
            replacementRows,
            data,
            selectedClientId
        };
        sessionStorage.setItem('bcba_session_state', JSON.stringify(stateToSave));
    }, [maladaptiveRows, replacementRows, data, selectedClientId, isLoaded, user]);

    // Clear Session on Logout
    useEffect(() => {
        if (!loading && !user) {
            sessionStorage.removeItem('bcba_session_state');
        }
    }, [user, loading]);

    const exportExcel = () => {
        const rows = Object.keys(data[currentTab]);
        if (rows.length === 0) {
            showAlert('Error', 'Generate data before exporting.', 'danger');
            return;
        }

        const header = ["Conducta", "Baseline"];
        for (let i = 1; i <= maxWeeks; i++) header.push(`S${i}`);

        const excelData = [header];
        rows.forEach(key => {
            const values = data[currentTab][key];
            const rowConfig = (currentTab === 'maladaptives' ? maladaptiveRows : replacementRows).find(r => r.name === key);
            excelData.push([key, rowConfig?.baseline || '', ...values.map(v => v ?? '')]);
        });

        const ws = XLSX.utils.aoa_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte_BCBA");
        XLSX.writeFile(wb, `BCBA_MasterData_${currentTab}.xlsx`);
    };

    // Fetch Clients & Presets
    useEffect(() => {
        if (!user) return;

        const fetchClients = async () => {
            try {
                const response = await authApi.getClients();
                if (response.ok) {
                    const clientData = await response.json();
                    setClients(clientData);
                } else {
                    console.error("Error fetching clients: API returned error");
                }
            } catch (error) {
                console.error("Error fetching clients:", error);
            }
        };

        const fetchPresets = async () => {
            const { data: presetData, error } = await supabase
                .from('presets')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (presetData) setPresets(presetData);
            if (error) console.error("Error fetching presets:", error);
        };

        fetchClients();
        fetchPresets();
    }, [user]);

    // Fetch History
    useEffect(() => {
        if (activeTab === 'history' && user) fetchHistory();
    }, [activeTab, user]);

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const clientId = selectedClientId || undefined;
            const response = await authApi.fetchGenerationHistory('BCBA', clientId);
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

    // --- PRESETS LOGIC ---

    const savePreset = async () => {
        if (!newPresetName.trim()) {
            showError('Please enter a name for the preset.');
            return;
        }

        const configToSave = {
            maladaptives: maladaptiveRows,
            replacements: replacementRows
        };

        try {
            const { data, error } = await supabase
                .from('presets')
                .insert({
                    user_id: user?.id,
                    name: newPresetName,
                    config: configToSave
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
        }
    };

    const loadPreset = (preset: Preset) => {
        if (preset.config.maladaptives) setMaladaptiveRows(preset.config.maladaptives);
        if (preset.config.replacements) setReplacementRows(preset.config.replacements);
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


    const generateSingleRow = (id: number) => {
        const row = activeRows.find(r => r.id === id);
        if (!row || !row.name) return;

        const mEnds = row.mastery.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)).sort((a, b) => a - b);
        const type = currentTab === 'maladaptives' ? 'reduction' : 'replacement';

        const behaviorPath = generatePath(row.baseline, row.weeks, mEnds, type);

        const values = behaviorPath.map(p => p.value);
        const mastery = behaviorPath.map(p => p.isMastery);

        const paddedValues = [...values, ...Array(Math.max(0, maxWeeks - values.length)).fill(null)];
        const paddedMastery = [...mastery, ...Array(Math.max(0, maxWeeks - mastery.length)).fill(false)];

        setData(prev => ({
            ...prev,
            [currentTab]: {
                ...prev[currentTab],
                [row.name]: paddedValues
            },
            mastery: {
                ...prev.mastery,
                [row.name]: paddedMastery
            }
        }));
    };

    const generateAll = () => {
        const newDataForTab: Record<string, (number | null)[]> = {};
        const newMasteryForTab: Record<string, boolean[]> = {};

        // We need to track cycle ends across rows to avoid alignment (Visual Aesthetic)
        let prevEndWeeks: number[] = [];

        activeRows.forEach(row => {
            if (!row.name) return;

            const mEnds = row.mastery.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)).sort((a, b) => a - b);
            const type = currentTab === 'maladaptives' ? 'reduction' : 'replacement';

            const behaviorPath = generatePath(row.baseline, row.weeks, mEnds, type);

            // Map to DataState format
            const values = behaviorPath.map(p => p.value);
            const mastery = behaviorPath.map(p => p.isMastery);

            // Pad to maxWeeks if row.weeks < maxWeeks
            const paddedValues = [...values, ...Array(Math.max(0, maxWeeks - values.length)).fill(null)];
            const paddedMastery = [...mastery, ...Array(Math.max(0, maxWeeks - mastery.length)).fill(false)];

            newDataForTab[row.name] = paddedValues;
            newMasteryForTab[row.name] = paddedMastery;
        });

        setData(prev => ({
            ...prev,
            [currentTab]: newDataForTab,
            mastery: { ...prev.mastery, ...newMasteryForTab }
        }));
    };

    const addInputRow = () => {
        const newId = (activeRows.length > 0 ? Math.max(...activeRows.map(r => r.id)) : 0) + 1;
        const defaultBL = currentTab === 'maladaptives' ? 85 : 1;
        setActiveRows([...activeRows, { id: newId, name: `Conducta ${newId}`, baseline: defaultBL, weeks: maxWeeks, mastery: '12, 24' }]);
    };

    const removeInputRow = (id: number) => {
        setActiveRows(activeRows.filter(r => r.id !== id));
    };

    const updateInputRow = (id: number, field: keyof InputRow, value: any) => {
        setActiveRows(activeRows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const clearCurrentTab = async () => {
        const isConfirmed = await confirm({
            title: 'Clear Data',
            message: 'Are you sure you want to clear all rows in this tab?',
            confirmText: 'Clear',
            type: 'danger'
        });
        if (isConfirmed) {
            setActiveRows([]);
            setData(prev => ({ ...prev, [currentTab]: {} }));
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const historyPayload = {
                module_type: 'BCBA',
                client_id: selectedClientId || null,
                input_data: { maladaptives: maladaptiveRows, replacements: replacementRows },
                output_data: data
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

    // ... (keep chart helper)
    const getChartData = (sourceData: DataState = data) => {
        const currentData = sourceData[currentTab];
        const chartData = [];
        for (let i = 0; i < maxWeeks; i++) {
            const row: any = { name: `S${i + 1}` };
            Object.keys(currentData).forEach(key => row[key] = currentData[key][i]);
            chartData.push(row);
        }
        return chartData;
    };

    return (
        <Layout>
            <AnimatePresence mode="wait">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-4xl">ssid_chart</span>
                            {t('bcbaGenerator')}
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
                                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === tab ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm' : 'text-neutral-500'}`}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {activeTab === 'generator' ? (
                    <motion.div
                        key="generator"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-6"
                    >
                        {/* Client Selector */}
                        <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm flex flex-col md:flex-row gap-6 items-end">
                            <div className={`flex-1 w-full ${isClientLocked ? 'pointer-events-none opacity-80' : ''}`}>
                                <label className="block text-sm font-medium text-neutral-400 mb-2">Select Client for High-Level Trend Association</label>
                                <ClientSelector
                                    clients={clients}
                                    selectedClientId={selectedClientId}
                                    onSelect={setSelectedClientId}
                                />
                                {isClientLocked && (
                                    <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">lock</span>
                                        Client locked by profile
                                    </p>
                                )}
                            </div>
                            <div className="bg-neutral-50 dark:bg-neutral-900 px-4 py-2 rounded-xl border border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500 italic max-w-xs">
                                Weekly trends associated with a client will appear in their clinical profile history.
                            </div>
                        </div>
                        {/* Tab Switcher at Top */}
                        <div className="flex gap-2 mb-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl w-fit border border-neutral-200 dark:border-neutral-700">
                            <button
                                onClick={() => setCurrentTab('maladaptives')}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${currentTab === 'maladaptives' ? 'bg-primary text-white shadow-lg' : 'text-neutral-500 hover:text-primary'}`}
                            >
                                {t('maladaptives')}
                            </button>
                            <button
                                onClick={() => setCurrentTab('replacements')}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${currentTab === 'replacements' ? 'bg-secondary text-neutral-900 shadow-lg' : 'text-neutral-500 hover:text-primary'}`}
                            >
                                {t('replacements')}
                            </button>
                        </div>

                        {/* Config Block */}
                        <div className="bg-white dark:bg-surface-dark rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                    <span className={`size-3 rounded-full ${currentTab === 'maladaptives' ? 'bg-primary' : 'bg-secondary'}`}></span>
                                    {currentTab === 'maladaptives' ? t('maladaptives') : t('replacements')}
                                </h3>

                                <div className="flex items-center gap-2">
                                    {/* Client Select */}
                                    <select
                                        value={selectedClientId}
                                        onChange={(e) => setSelectedClientId(e.target.value)}
                                        className="h-10 px-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
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
                                                                <div key={preset.id} className="flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-lg group cursor-pointer" onClick={() => loadPreset(preset as any)}>
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
                                                            disabled={!newPresetName.trim()}
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

                            <div className="space-y-3">
                                <div className="grid grid-cols-12 gap-4 text-xs font-bold text-neutral-500 uppercase px-3">
                                    <div className="col-span-1 text-center">#</div>
                                    <div className="col-span-4">{t('behavior_name')}</div>
                                    <div className="col-span-2">Baseline</div>
                                    <div className="col-span-2">Weeks</div>
                                    <div className="col-span-2">Mastery Ends</div>
                                    <div className="col-span-1">Act.</div>
                                </div>
                                {activeRows.length === 0 ? (
                                    <div className="text-center py-8 text-neutral-400 border-2 border-dashed border-neutral-100 dark:border-neutral-800 rounded-xl">
                                        No {currentTab === 'maladaptives' ? 'behaviors' : 'skills'} added yet. Click "+ Add Row" to begin.
                                    </div>
                                ) : (
                                    activeRows.map((row, idx) => (
                                        <div key={row.id} className="grid grid-cols-12 gap-4 items-center">
                                            <div className="col-span-1 text-center font-mono text-neutral-400">{idx + 1}</div>
                                            <div className="col-span-4">
                                                <input
                                                    type="text"
                                                    value={row.name}
                                                    onChange={(e) => updateInputRow(row.id, 'name', e.target.value)}
                                                    className="w-full h-10 px-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="number"
                                                    value={row.baseline}
                                                    onChange={(e) => updateInputRow(row.id, 'baseline', parseInt(e.target.value))}
                                                    className="w-full h-10 px-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-center font-mono"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="number"
                                                    value={row.weeks}
                                                    onChange={(e) => updateInputRow(row.id, 'weeks', parseInt(e.target.value))}
                                                    className="w-full h-10 px-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-center font-mono"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="text"
                                                    value={row.mastery}
                                                    onChange={(e) => updateInputRow(row.id, 'mastery', e.target.value)}
                                                    className="w-full h-10 px-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-center font-mono"
                                                    placeholder="e.g. 12, 26"
                                                />
                                            </div>
                                            <div className="col-span-1 flex gap-1">
                                                <button onClick={() => generateSingleRow(row.id)} className="p-2 text-primary hover:bg-neutral-50 rounded-lg transition-colors" title="Refresh">
                                                    <span className="material-symbols-outlined">autorenew</span>
                                                </button>
                                                <button onClick={() => removeInputRow(row.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Remove">
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="mt-6 flex flex-col md:flex-row gap-3">
                                <button onClick={addInputRow} className="px-6 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold rounded-lg hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-sm">add</span>
                                    Add Row
                                </button>
                                <button onClick={generateAll} className={`flex-1 px-4 py-2 font-bold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 ${currentTab === 'maladaptives' ? 'bg-primary text-white shadow-primary/20' : 'bg-secondary text-neutral-900 shadow-secondary/20'}`}>
                                    <span className="material-symbols-outlined">auto_awesome</span>
                                    GENERATE ALL
                                </button>
                                <button onClick={clearCurrentTab} className="px-6 py-2 bg-red-50 dark:bg-red-900/10 text-red-500 font-bold rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-sm">clear_all</span>
                                    Clear Tab
                                </button>
                            </div>
                        </div>

                        {/* Show results only when data is generated */}
                        {Object.keys(data[currentTab]).length > 0 && (
                            <>
                                {/* Table First (Moved Above Chart) */}
                                <div className="bg-white dark:bg-surface-dark rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm border-collapse">
                                            <thead className="bg-neutral-50 dark:bg-neutral-900 text-xs uppercase font-bold text-neutral-500 sticky top-0">
                                                <tr>
                                                    <th className="p-3 border-r border-neutral-200 dark:border-neutral-800 sticky left-0 bg-neutral-50 dark:bg-neutral-900 z-10 text-left">Behavior (BL)</th>
                                                    {Array.from({ length: maxWeeks }).map((_, i) => (
                                                        <th key={i} className="p-2 border-r border-neutral-200 dark:border-neutral-800 text-center min-w-[40px]">S{i + 1}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                                {Object.keys(data[currentTab]).map(key => {
                                                    const row = activeRows.find(r => r.name === key);
                                                    return (
                                                        <tr key={key} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                                            <td className="p-3 font-bold sticky left-0 bg-white dark:bg-surface-dark border-r border-neutral-200 dark:border-neutral-800 text-left min-w-[180px]">
                                                                {key} {row ? `(BL: ${row.baseline})` : ''}
                                                            </td>
                                                            {data[currentTab][key].map((val, idx) => {
                                                                // Determine visual style based on Mastery
                                                                const isMastery = data.mastery?.[key]?.[idx];
                                                                return (
                                                                    <td
                                                                        key={idx}
                                                                        className={`p-2 text-center border-r border-neutral-200 dark:border-neutral-800 font-mono ${isMastery ? 'bg-yellow-100 text-yellow-800 font-bold dark:bg-yellow-900/40 dark:text-yellow-200 relative' : ''
                                                                            }`}
                                                                    >
                                                                        {val}
                                                                        {isMastery && <span className="absolute top-0 right-1 text-[8px] opacity-50">M</span>}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Chart Second (Moved Below Table) */}
                                <div className="h-[400px] bg-white dark:bg-surface-dark rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={getChartData()}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <Tooltip contentStyle={{ backgroundColor: '#171717', color: '#fff', borderRadius: '8px', border: '1px solid #404040' }} />
                                            <Legend />
                                            {Object.keys(data[currentTab]).map((key, i) => (
                                                <Line
                                                    key={key}
                                                    type="monotone"
                                                    dataKey={key}
                                                    stroke={`hsl(${i * 45}, 70%, 50%)`}
                                                    strokeWidth={3}
                                                    dot={{ r: 4 }}
                                                />
                                            ))}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="flex justify-end gap-3 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl">
                                    <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-neutral-800 text-white font-bold rounded-lg hover:bg-neutral-700">
                                        <span className="material-symbols-outlined">save</span> Save History
                                    </button>
                                </div>
                            </>
                        )}
                    </motion.div>
                ) : (
                    <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
                        {/* Simplified History View */}
                        <div className="grid gap-4">
                            {history.length === 0 ? (
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
                                                    if (h.output_data) setData(h.output_data);
                                                    // Restore Inputs if available
                                                    if (h.input_data) {
                                                        if (h.input_data.maladaptives) setMaladaptiveRows(h.input_data.maladaptives);
                                                        if (h.input_data.replacements) setReplacementRows(h.input_data.replacements);
                                                    }
                                                    setActiveTab('generator');
                                                    showAlert('Success', 'Data loaded from history.', 'success');
                                                }}
                                                className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-bold hover:bg-primary/20 transition-colors"
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
        </Layout>
    );
};

export default BCBAGenerator;