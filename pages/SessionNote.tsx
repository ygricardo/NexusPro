import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { extractTextFromPDF } from '../lib/pdf';
import { generateSessionNotes } from '../lib/gemini';
import { useConfirm } from '../contexts/ConfirmContext';
import { useUser } from '../contexts/UserContext';
import ClientSelector from '../components/ClientSelector';
import { authApi } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import {
    Bold, Italic, Underline, List, ListOrdered, Signature, Download, History,
    Save, AlertTriangle, Lock, Unlock, FileText, Activity, Clock,
    Trash2, Calendar, Search, ArrowLeft, ChevronRight, BrainCircuit,
    Wand2, X
} from 'lucide-react';

// --- Components ---

const BehaviorMetricsPanel = ({ clientId, clientName }: { clientId: string, clientName: string }) => {
    return (
        <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="size-5 text-indigo-400" />
                    Behavior Metrics
                </h3>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-2 py-1 rounded bg-white/5 border border-white/5">
                    Total: 0
                </span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 opacity-50 border-2 border-dashed border-white/5 rounded-2xl mb-4">
                <Activity className="size-12 mb-4 animate-pulse text-indigo-500/20" />
                <p className="text-[10px] font-black uppercase tracking-widest">AWAITING DATA INPUT...</p>
            </div>

            <div className="mt-auto pt-6 border-t border-white/5 text-[10px] text-neutral-600 text-center italic">
                {clientId ? `Quantitative analysis for ${clientName}` : "Select client to begin analysis"}
            </div>
        </div>
    );
};


const SessionNote = () => {
    const { t } = useLanguage();
    const { confirm } = useConfirm();
    const { success, error: toastError } = useToast();
    const { user } = useUser();
    const navigate = useNavigate();

    // --- State ---
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [clientName, setClientName] = useState(''); // Manual override

    const [narrative, setNarrative] = useState('');
    const [historyNotes, setHistoryNotes] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showAISettings, setShowAISettings] = useState(false);

    // AI Generation State
    const [numberOfNotes, setNumberOfNotes] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Editor Refs
    const editorRef = useRef<HTMLDivElement>(null);
    const [isVerified, setIsVerified] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // URL Params Logic
    const [searchParams] = useSearchParams();
    const urlClientId = searchParams.get('client_id');
    const [isClientLocked, setIsClientLocked] = useState(false);

    // --- Effects ---

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await authApi.getClients();
                if (res.ok) setClients(await res.json());
            } catch (err) {
                console.error("Failed to fetch clients", err);
            }
        };
        fetchClients();
    }, []);

    useEffect(() => {
        if (selectedClientId) {
            fetchHistory();
        } else {
            setHistoryNotes([]);
        }
    }, [selectedClientId]);

    useEffect(() => {
        if (urlClientId && clients.length > 0) {
            const found = clients.find(c => c.id === urlClientId);
            if (found) {
                setSelectedClientId(found.id);
                setIsClientLocked(true);
            }
        }
    }, [urlClientId, clients]);

    const fetchHistory = async () => {
        if (!selectedClientId) return;
        setIsLoadingHistory(true);
        try {
            const res = await authApi.getClientHistory(selectedClientId);
            if (res.ok) {
                const data = await res.json();
                // Ensure we handle the object response { notes, daily, weekly }
                // and filter/sort the notes properly
                const notes = Array.isArray(data.notes) ? data.notes : [];
                setHistoryNotes(notes);
            }
        } catch (err) {
            console.error("Failed to fetch history", err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setSelectedFile(e.target.files[0]);
            success('PDF Uploaded');
            setShowAISettings(true);
        }
    };

    const handleGenerateNotes = async () => {
        if (!selectedFile) return toastError('Upload PDF first');
        if (!selectedClientId && !clientName) return toastError('Select a client');

        setIsGenerating(true);
        setShowAISettings(false);
        try {
            const text = await extractTextFromPDF(selectedFile);
            const generated = await generateSessionNotes(
                text,
                numberOfNotes,
                clientName || clients.find(c => c.id === selectedClientId)?.first_name || 'Client'
            );

            const content = Array.isArray(generated) ? generated.join('\n\n') : generated;
            setNarrative(content);
            if (editorRef.current) editorRef.current.innerText = content;
            success('Draft Generated');
        } catch (err) {
            console.error(err);
            toastError('Generation Failed');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async (isSigned: boolean) => {
        if (!selectedClientId) return toastError('Select Client');
        if (!narrative.trim()) return toastError('Note is empty');

        setIsSaving(true);
        try {
            const noteData = {
                client_id: selectedClientId,
                content: narrative,
                case_tag: clientName || 'Session Note',
                is_verified: isSigned, // Mapping is_signed to is_verified for backend
                quantitative_summary: null // Placeholder for future metrics
            };
            const res = await authApi.saveNote(noteData);
            if (res.ok) {
                success(isSigned ? 'Signed & Submitted' : 'Draft Saved');
                fetchHistory(); // Refresh history
                if (isSigned) {
                    setNarrative('');
                    if (editorRef.current) editorRef.current.innerText = '';
                    setIsVerified(false);
                }
            } else {
                toastError('Save failed');
            }
        } catch (err) {
            console.error(err);
            toastError('Save Error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFormat = (cmd: string) => {
        document.execCommand(cmd, false, undefined);
        editorRef.current?.focus();
    };

    const loadFromHistory = (note: any) => {
        setNarrative(note.content);
        if (editorRef.current) editorRef.current.innerText = note.content;
        setSelectedClientId(note.client_id);
        setShowHistory(false);
        success('Note Loaded');
    };

    const selectedClientObj = clients.find(c => c.id === selectedClientId);

    return (
        <Layout>
            <div className="max-w-[1800px] mx-auto p-4 md:p-8 min-h-screen flex flex-col gap-6 relative">

                {/* --- History Side Panel --- */}
                <AnimatePresence>
                    {showHistory && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowHistory(false)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                            />
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-neutral-900 border-l border-white/10 z-[101] shadow-2xl flex flex-col"
                            >
                                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-neutral-900/50 backdrop-blur-md">
                                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                                        <History className="size-5 text-indigo-400" />
                                        Note History
                                    </h2>
                                    <button onClick={() => setShowHistory(false)} className="size-8 rounded-full hover:bg-white/5 flex items-center justify-center text-neutral-400 transition-colors">
                                        <X className="size-5" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                    {!selectedClientId ? (
                                        <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-center px-8">
                                            <Search className="size-12 mb-4 opacity-20" />
                                            <p className="font-bold text-white mb-1">No Client Selected</p>
                                            <p className="text-xs">Select a client to see their clinical note history.</p>
                                        </div>
                                    ) : isLoadingHistory ? (
                                        <div className="h-full flex items-center justify-center">
                                            <div className="animate-spin size-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
                                        </div>
                                    ) : historyNotes.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-center px-8">
                                            <FileText className="size-12 mb-4 opacity-20" />
                                            <p className="font-bold text-white mb-1">Empty History</p>
                                            <p className="text-xs">No saved notes found for this client.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {historyNotes.map((note) => (
                                                <div
                                                    key={note.id}
                                                    onClick={() => loadFromHistory(note)}
                                                    className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-white/10 transition-all cursor-pointer group"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                                                            {note.is_verified ? 'SIGNED' : 'DRAFT'}
                                                        </span>
                                                        <span className="text-[10px] text-neutral-500 font-mono">
                                                            {new Date(note.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                                                        {note.case_tag || 'Untitled Note'}
                                                    </h3>
                                                    <p className="text-xs text-neutral-400 line-clamp-2 mt-1">
                                                        {note.content}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col gap-6">

                    {/* Editor Card */}
                    <div className="flex-1 bg-[#1e1e1e] border border-white/5 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative min-h-[700px]">

                        {/* Integrated Clinical Header */}
                        <div className="px-6 py-4 bg-[#1e1e1e] border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest border border-white/5 px-3 py-2 rounded-xl bg-white/5"
                                >
                                    <ArrowLeft className="size-3" />
                                    Back
                                </button>
                                <div className="h-4 w-px bg-white/10" />
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shrink-0">
                                        <FileText className="size-5 text-indigo-400" />
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                        <h3 className="text-sm font-black text-white uppercase tracking-[0.15em] truncate">Clinical Session Note</h3>
                                        <span className="text-[10px] font-black text-indigo-400/80 uppercase tracking-widest truncate">
                                            Client: {selectedClientObj ? `${selectedClientObj.first_name} ${selectedClientObj.last_name}` : 'No Client Selected'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-center md:justify-end">
                                {/* AI Selector & Processor */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowAISettings(!showAISettings)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isGenerating ? 'bg-indigo-500/20 text-indigo-400 animate-pulse' : showAISettings ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-neutral-400 hover:bg-white/10 border border-white/5'}`}
                                    >
                                        {isGenerating ? <Wand2 className="size-3 animate-spin" /> : <BrainCircuit className="size-3" />}
                                        AI Assistant
                                    </button>

                                    <AnimatePresence>
                                        {showAISettings && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute right-0 top-full mt-2 w-72 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl p-4 z-[100]"
                                            >
                                                <h4 className="text-[10px] font-black text-white mb-4 uppercase tracking-[0.2em] opacity-60 px-1 font-bold">Generation Settings</h4>

                                                <div className="space-y-4">
                                                    <div>
                                                        <div className="flex justify-between items-center mb-2 px-1">
                                                            <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Training Data (PDF)</label>
                                                            {selectedFile && <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">Ready</span>}
                                                        </div>
                                                        <input
                                                            type="file"
                                                            ref={fileInputRef}
                                                            onChange={handleFileChange}
                                                            className="hidden"
                                                            accept=".pdf"
                                                        />
                                                        <button
                                                            onClick={() => fileInputRef.current?.click()}
                                                            className={`w-full p-4 rounded-xl border border-dashed text-xs flex flex-col items-center justify-center gap-2 transition-all ${selectedFile ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400' : 'border-neutral-700 bg-white/5 text-neutral-400 hover:bg-white/10'}`}
                                                        >
                                                            {selectedFile ? (
                                                                <>
                                                                    <Download className="size-5" />
                                                                    <span className="truncate max-w-full italic font-mono text-[10px]">{selectedFile.name}</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Download className="size-5" />
                                                                    <span className="font-bold">Select Assessment PDF</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>

                                                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                                        <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Narratives</label>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => setNumberOfNotes(Math.max(1, numberOfNotes - 1))}
                                                                className="size-6 rounded-lg bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 text-white border border-white/5 text-xs transition-colors"
                                                            >-</button>
                                                            <span className="text-xs font-mono font-bold text-white w-4 text-center">{numberOfNotes}</span>
                                                            <button
                                                                onClick={() => setNumberOfNotes(Math.min(5, numberOfNotes + 1))}
                                                                className="size-6 rounded-lg bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 text-white border border-white/5 text-xs transition-colors"
                                                            >+</button>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={handleGenerateNotes}
                                                        disabled={!selectedFile || isGenerating}
                                                        className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:bg-neutral-800 disabled:shadow-none transition-all flex items-center justify-center gap-2 uppercase tracking-[0.2em]"
                                                    >
                                                        {isGenerating ? <Wand2 className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />}
                                                        Generate Draft
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest transition-all relative border border-white/5"
                                >
                                    <History className="size-3" />
                                    History
                                    {historyNotes.length > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 size-5 bg-indigo-500 text-white flex items-center justify-center rounded-full text-[9px] font-black shadow-lg border-2 border-[#1e1e1e]">
                                            {historyNotes.length}
                                        </span>
                                    )}
                                </button>

                            </div>
                        </div>

                        {/* Highly Visible Warning Banner */}
                        <div className="bg-amber-500/10 border-b border-amber-500/20 p-4 flex items-start gap-4">
                            <div className="p-1.5 bg-amber-500/20 rounded-lg">
                                <AlertTriangle className="size-4 text-amber-400 shrink-0" />
                            </div>
                            <p className="text-[11px] text-amber-200/80 leading-relaxed font-bold">
                                <span className="text-amber-400 font-black">AI-ASSISTED DRAFT:</span> Artificial intelligence can make mistakes. It is the <span className="text-white underline decoration-amber-500/50">sole responsibility of the clinician</span> to review, edit, and verify the accuracy of this note before signing.
                            </p>
                        </div>

                        {/* Toolbar */}
                        <div className="bg-white/[0.02] border-b border-white/5 p-2 flex items-center gap-1 sticky top-0 z-10 backdrop-blur-md">
                            <button onClick={() => handleFormat('bold')} className="p-2 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors" title="Bold">
                                <Bold className="size-4" />
                            </button>
                            <button onClick={() => handleFormat('italic')} className="p-2 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors" title="Italic">
                                <Italic className="size-4" />
                            </button>
                            <button onClick={() => handleFormat('underline')} className="p-2 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors" title="Underline">
                                <Underline className="size-4" />
                            </button>
                            <div className="w-px h-4 bg-white/10 mx-2" />
                            <button onClick={() => handleFormat('insertUnorderedList')} className="p-2 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors" title="Bullets">
                                <List className="size-4" />
                            </button>
                            <button onClick={() => handleFormat('insertOrderedList')} className="p-2 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors" title="Numbers">
                                <ListOrdered className="size-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div
                            className="flex-1 p-8 md:p-12 overflow-y-auto cursor-text text-neutral-200 bg-[#1a1a1a] relative"
                            onClick={() => editorRef.current?.focus()}
                        >
                            <div
                                ref={editorRef}
                                contentEditable
                                className="w-full h-full outline-none prose prose-invert prose-indigo max-w-none font-sans text-base leading-relaxed relative z-10"
                                onInput={(e) => setNarrative(e.currentTarget.innerText)}
                                spellCheck={true}
                            />
                            {!narrative && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300">
                                    <div className="text-center opacity-[0.02]">
                                        <p className="text-[120px] font-black tracking-[0.2em] leading-none select-none text-white">READY</p>
                                        <p className="text-[120px] font-black tracking-[0.2em] leading-none select-none text-white">TO WRITE</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Internal Footer */}
                        <div className="bg-[#1e1e1e] p-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Status</span>
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${narrative.length > 0 ? 'text-indigo-400' : 'text-neutral-600'}`}>
                                        {narrative.length > 0 ? 'Document in Progress' : 'Empty Canvas'}
                                    </span>
                                </div>
                                <div className="flex flex-col border-l border-white/5 pl-6">
                                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Metrics</span>
                                    <span className="text-[11px] font-mono font-bold text-neutral-400">
                                        {narrative.length} CHARACTERS
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleSave(true)}
                                    disabled={!narrative.trim() || isSaving}
                                    className={`flex items-center gap-3 px-10 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-white shadow-xl transition-all ${!narrative.trim() ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'}`}
                                >
                                    <Save className="size-4" />
                                    {isSaving ? 'Saving...' : 'Save Clinical Note'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Legal Footer */}
                    <div className="mt-8 mb-12 flex items-center justify-center gap-2 text-neutral-600 opacity-60">
                        <Clock className="size-3" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">
                            NexusPro AI is a clinical assistant tool, not a substitute for professional judgment.
                        </p>
                    </div>

                </div>
            </div>
        </Layout>
    );
};

export default SessionNote;