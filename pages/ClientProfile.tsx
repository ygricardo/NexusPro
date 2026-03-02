
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { authApi } from '../lib/api';
import { motion } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useToast } from '../contexts/ToastContext';
import UpgradeModal from '../components/UpgradeModal';

const ClientProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<any>(null);
    const { user, checkAccess } = useUser();
    const { confirm } = useConfirm();
    const { success, error: toastError } = useToast();
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    const [searchParams] = useSearchParams();

    // Determine initial tab from URL ?tab= param, fallback to 'daily'
    const tabParam = searchParams.get('tab');
    const initialTab: 'daily' | 'weekly' | 'notes' =
        tabParam === 'weekly' ? 'weekly' :
            tabParam === 'notes' ? 'notes' : 'daily';

    const [historyTab, setHistoryTab] = useState<'notes' | 'daily' | 'weekly'>(initialTab);
    const [selectedNote, setSelectedNote] = useState<any>(null);

    useEffect(() => {
        if (id) {
            fetchClientDetails();
            fetchHistory();
        }
    }, [id]);

    const handleDeleteNote = async (e: React.MouseEvent, noteId: string) => {
        e.stopPropagation();
        if (await confirm({ title: 'Delete Note?', message: 'Are you sure you want to permanently delete this session note?' })) {
            try {
                const res = await authApi.deleteNote(noteId);
                if (res.ok) {
                    success('Note deleted');
                    fetchHistory();
                } else {
                    toastError('Fail to delete note');
                }
            } catch (error) {
                toastError('Error deleting note');
            }
        }
    };

    const handleDeleteRecord = async (e: React.MouseEvent, recordId: string) => {
        e.stopPropagation();
        if (await confirm({ title: 'Delete Record?', message: 'Are you sure you want to permanently delete this data record?' })) {
            try {
                const res = await authApi.deleteGenerationHistory(recordId);
                if (res.ok) {
                    success('Record deleted');
                    fetchHistory();
                } else {
                    toastError('Fail to delete record');
                }
            } catch (error) {
                toastError('Error deleting record');
            }
        }
    };

    const fetchClientDetails = async () => {
        try {
            const res = await authApi.getClient(id!);
            if (res.ok) {
                const data = await res.json();
                setClient(data);
            } else {
                navigate('/caseload'); // Redirect if not found
            }
        } catch (error) {
            console.error('Error fetching client:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await authApi.getClientHistory(id!);
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    const calculateAge = (dobString: string) => {
        if (!dobString) return 'N/A';
        const dob = new Date(dobString);
        const diff_ms = Date.now() - dob.getTime();
        const age_dt = new Date(diff_ms);
        return Math.abs(age_dt.getUTCFullYear() - 1970);
    };

    if (loading) return <Layout><div className="flex h-screen items-center justify-center"><span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span></div></Layout>;
    if (!client) return null;

    return (
        <Layout>
            <div className="min-h-screen bg-neutral-50 dark:bg-midnight">
                {/* HERO HEADER - Folder Style */}
                <div className="bg-white dark:bg-surface-dark border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
                    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
                        <div className="mb-4">
                            <Link to="/caseload" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-sm">arrow_back</span>
                                Back to Caseload
                            </Link>
                        </div>

                        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                            {/* Avatar */}
                            <div className="size-24 md:size-32 rounded-3xl bg-neutral-100 dark:bg-neutral-800 border-4 border-white dark:border-neutral-700 shadow-xl flex-shrink-0 flex items-center justify-center text-4xl font-black text-neutral-400 dark:text-neutral-500">
                                {client.first_name[0]}{client.last_name[0]}
                            </div>

                            {/* Info */}
                            <div className="flex-1 text-center md:text-left">
                                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                                    <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                                        {client.first_name} {client.last_name}
                                    </h1>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${client.status === 'Active'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                                        : 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'
                                        }`}>
                                        <span className={`size-2 rounded-full mr-2 ${client.status === 'Active' ? 'bg-emerald-500' : 'bg-neutral-500'}`}></span>
                                        {client.status || 'Active'}
                                    </span>
                                </div>

                                <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm text-neutral-500 dark:text-neutral-400 mt-4">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-lg">cake</span>
                                        <span>DOB: <span className="font-medium text-neutral-900 dark:text-white">{new Date(client.created_at).toLocaleDateString()}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-lg">medical_information</span>
                                        <span>Diagnosis: <span className="font-medium text-neutral-900 dark:text-white">{client.diagnosis || 'N/A'}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-lg">schedule</span>
                                        <span>Age: <span className="font-medium text-neutral-900 dark:text-white">{calculateAge(client.created_at || '2000-01-01')} yrs</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                {/* MAIN CONTENT */}
                <div className="w-full px-4 sm:px-6 lg:px-8 py-8">

                    <UpgradeModal
                        isOpen={isUpgradeModalOpen}
                        onClose={() => setIsUpgradeModalOpen(false)}
                    />

                    {/* FOLDER TABS NAVIGATION */}
                    <div className="flex flex-wrap gap-2 mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-1">
                        {[
                            { id: 'daily', label: 'Daily Data', icon: 'calculate', color: 'text-blue-600', activeBg: 'bg-blue-50 border-blue-200 text-blue-700', moduleId: 'rbt_generator' },
                            { id: 'weekly', label: 'Weekly Data', icon: 'analytics', color: 'text-purple-600', activeBg: 'bg-purple-50 border-purple-200 text-purple-700', moduleId: 'bcba_generator' },
                            { id: 'notes', label: 'Session Notes', icon: 'description', color: 'text-indigo-600', activeBg: 'bg-indigo-50 border-indigo-200 text-indigo-700', moduleId: 'note_generator' },
                        ].map((tab) => {
                            const isLocked = tab.moduleId ? !checkAccess([], false, tab.moduleId) : false; // Check lock status

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        if (isLocked) {
                                            // Optional: Still allow clicking to trigger modal, OR simply select it to show locked view.
                                            // The user said "access to them... padlock... clicking triggers modal".
                                            // If we want the "Locked View" to persist, we should allow selection?
                                            // But previous implementation was: click -> modal.
                                            // If I remove 'docs', I force them onto 'daily'.
                                            // So 'daily' MUST be selectable OR default selected.
                                            // If It is selected, we show locked view.
                                            // If I click another locked one, I should probably switch to it AND show upgrade modal?
                                            // Or just switch and show locked view.
                                            // Let's allow switching even if locked, so they can see the "this is locked" screen for each.
                                            setHistoryTab(tab.id as any);
                                            // Also maybe trigger modal?
                                            // setIsUpgradeModalOpen(true); 
                                        } else {
                                            setHistoryTab(tab.id as any);
                                        }
                                    }}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-t-xl border-t border-x border-transparent font-bold transition-all relative ${historyTab === tab.id
                                        ? `${tab.activeBg} border-b-white dark:border-b-surface-dark translate-y-[1px]`
                                        : isLocked
                                            ? 'bg-transparent text-neutral-400 opacity-70 hover:opacity-100' // Locked style
                                            : 'bg-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:text-neutral-400'
                                        }`}
                                >
                                    <span className={`material-symbols-outlined ${historyTab === tab.id && !isLocked ? '' : isLocked ? 'text-neutral-400' : tab.color}`}>
                                        {tab.icon}
                                    </span>
                                    {tab.label}
                                    {isLocked && (
                                        <span className="material-symbols-outlined text-[14px] text-amber-500 absolute top-2 right-2">lock</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* FOLDER CONTENT AREA */}
                    <div className="bg-white dark:bg-surface-dark border border-neutral-200 dark:border-neutral-800 rounded-b-3xl rounded-tr-3xl shadow-sm min-h-[500px] relative mt-[-1px]">

                        {!history && loading ? (
                            <div className="flex flex-col items-center justify-center p-20 text-neutral-500">
                                <span className="material-symbols-outlined text-4xl mb-2 animate-spin">sync</span>
                                <p>Loading folder contents...</p>
                            </div>
                        ) : (
                            <div className="p-6 md:p-8">

                                {/* SESSION NOTES TAB */}
                                {historyTab === 'notes' && (checkAccess([], false, 'note_generator') ? (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center pb-6 border-b border-neutral-100 dark:border-neutral-800">
                                            <div>
                                                <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-indigo-600">description</span>
                                                    Clinical Session Notes
                                                </h2>
                                                <p className="text-sm text-neutral-500">Manage and create session notes for this client.</p>
                                            </div>
                                            <Link
                                                to={`/session-note?client_id=${client.id}`}
                                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
                                            >
                                                <span className="material-symbols-outlined text-xl">add</span>
                                                New Note
                                            </Link>
                                        </div>

                                        <div className="grid gap-4">
                                            {!history || history.notes.length === 0 ? (
                                                <EmptyState
                                                    icon="event_note"
                                                    title="No Session Notes Found"
                                                    desc="Create your first session note to start tracking clinical progress."
                                                />
                                            ) : (
                                                history.notes.map((note: any) => (
                                                    <div key={note.id} className="p-5 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group relative overflow-hidden" onClick={() => setSelectedNote(note)}>
                                                        <div className="flex justify-between items-start mb-3 relative z-10">
                                                            <div className="flex items-center gap-3">
                                                                <div className="size-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                                    {new Date(note.created_at).getDate()}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-neutral-900 dark:text-white">{new Date(note.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                                                    <div className="text-xs text-neutral-500">Created by {note.provider_name || 'You'}</div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 relative z-20">
                                                                <button
                                                                    onClick={(e) => handleDeleteNote(e, note.id)}
                                                                    className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                                    title="Delete Note"
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        sessionStorage.setItem('session_note_edit_id', note.id);
                                                                        navigate(`/session-note?client_id=${client.id}`);
                                                                    }}
                                                                    className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex items-center gap-1 text-neutral-600 dark:text-neutral-300 opacity-0 group-hover:opacity-100"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">edit</span>
                                                                    Edit Note
                                                                </button>
                                                                <div className="text-[10px] text-indigo-700 dark:text-indigo-300 uppercase font-black px-2 py-1 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg tracking-wider">{note.case_tag || 'Standard'}</div>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2 pl-13 relative z-10">"{note.content.substring(0, 200)}..."</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ) : <LockedContent title="Session Notes Locked" moduleName="Clinical Session Notes" onUpgrade={() => setIsUpgradeModalOpen(true)} />)}

                                {/* RBT DAILY DATA TAB */}
                                {historyTab === 'daily' && (checkAccess([], false, 'rbt_generator') ? (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center pb-6 border-b border-neutral-100 dark:border-neutral-800">
                                            <div>
                                                <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-blue-600">calculate</span>
                                                    Daily Data Records
                                                </h2>
                                                <p className="text-sm text-neutral-500">Log and review daily behavioral data measurements.</p>
                                            </div>
                                            <Link
                                                to={`/rbt-generator?client_id=${client.id}`}
                                                onClick={() => sessionStorage.removeItem('rbt_session_state')}
                                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-lg shadow-blue-200 dark:shadow-none"
                                            >
                                                <span className="material-symbols-outlined text-xl">add</span>
                                                New Daily Data
                                            </Link>
                                        </div>

                                        <div className="grid gap-3">
                                            {!history || history.daily.length === 0 ? (
                                                <EmptyState
                                                    icon="bar_chart"
                                                    title="No Daily Data"
                                                    desc="Start logging daily RBT measurements to track behavioral frequency."
                                                />
                                            ) : (
                                                history.daily.map((record: any) => (
                                                    <div key={record.id} className="p-5 bg-white dark:bg-neutral-900/50 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:shadow-md transition-shadow group relative overflow-hidden">
                                                        <div className="flex justify-between items-center mb-4 relative z-10">
                                                            <div className="flex items-center gap-4">
                                                                <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                                                    <span className="material-symbols-outlined">calculate</span>
                                                                </div>
                                                                <div>
                                                                    <div className="text-base font-bold text-neutral-900 dark:text-white">Daily Data Session</div>
                                                                    <div className="text-xs text-neutral-500 flex items-center gap-1">
                                                                        <span className="material-symbols-outlined text-[10px]">calendar_today</span>
                                                                        {new Date(record.created_at).toLocaleDateString()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 relative z-20">
                                                                <button
                                                                    onClick={(e) => handleDeleteRecord(e, record.id)}
                                                                    className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                                    title="Delete Record"
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const stateToSave = {
                                                                            userId: user?.id,
                                                                            inputs: record.input_data || [],
                                                                            results: record.output_data || [],
                                                                            selectedClientId: client.id,
                                                                            activeHistoryId: record.id
                                                                        };
                                                                        sessionStorage.setItem('rbt_session_state', JSON.stringify(stateToSave));
                                                                        navigate(`/rbt-generator?client_id=${client.id}`);
                                                                    }}
                                                                    className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex items-center gap-1 text-neutral-600 dark:text-neutral-300"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">edit</span>
                                                                    Edit Data
                                                                </button>
                                                                <div className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-bold px-3 py-1 rounded-lg text-xs">
                                                                    {record.behaviors?.length || 0} Behaviors
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 relative z-10">
                                                            {record.behaviors && record.behaviors.map((b: any, i: number) => (
                                                                <div key={i} className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-800 p-3 rounded-lg border border-neutral-100 dark:border-neutral-700">
                                                                    <span className="text-sm text-neutral-700 dark:text-neutral-300 font-medium truncate pr-2">{b.name}</span>
                                                                    <span className="text-lg font-black text-neutral-900 dark:text-white">{b.total}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ) : <LockedContent title="Daily Data Locked" moduleName="Daily Data" onUpgrade={() => setIsUpgradeModalOpen(true)} />)}

                                {/* BCBA WEEKLY TAB */}
                                {historyTab === 'weekly' && (checkAccess([], false, 'bcba_generator') ? (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center pb-6 border-b border-neutral-100 dark:border-neutral-800">
                                            <div>
                                                <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-purple-600">analytics</span>
                                                    Weekly Data Analysis
                                                </h2>
                                                <p className="text-sm text-neutral-500">Review weekly mastery trends and generating reports.</p>
                                            </div>
                                            <Link
                                                to={`/bcba-generator?client_id=${client.id}`}
                                                onClick={() => sessionStorage.removeItem('bcba_session_state')}
                                                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-lg shadow-purple-200 dark:shadow-none"
                                            >
                                                <span className="material-symbols-outlined text-xl">add</span>
                                                New Weekly Data
                                            </Link>
                                        </div>

                                        <div className="grid gap-3">
                                            {!history || history.weekly.length === 0 ? (
                                                <EmptyState
                                                    icon="trending_up"
                                                    title="No Weekly Analysis"
                                                    desc="Generate weekly analysis reports to monitor client mastery and trends."
                                                />
                                            ) : (
                                                history.weekly.map((record: any) => (
                                                    <div key={record.id} className="p-5 bg-white dark:bg-neutral-900/50 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:shadow-md transition-shadow group relative overflow-hidden">
                                                        <div className="flex justify-between items-center mb-4 relative z-10">
                                                            <div className="flex items-center gap-4">
                                                                <div className="size-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                                                    <span className="material-symbols-outlined">analytics</span>
                                                                </div>
                                                                <div>
                                                                    <div className="text-base font-bold text-neutral-900 dark:text-white">Weekly Data Analysis</div>
                                                                    <div className="text-xs text-neutral-500 flex items-center gap-1">
                                                                        <span className="material-symbols-outlined text-[10px]">calendar_today</span>
                                                                        {new Date(record.created_at).toLocaleDateString()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 relative z-20">
                                                                <button
                                                                    onClick={(e) => handleDeleteRecord(e, record.id)}
                                                                    className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                                    title="Delete Record"
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const stateToSave = {
                                                                            userId: user?.id,
                                                                            maladaptiveRows: record.maladaptives || [],
                                                                            replacementRows: record.replacements || [],
                                                                            data: record.output_data || {
                                                                                maladaptives: {},
                                                                                replacements: {},
                                                                                mastery: {}
                                                                            },
                                                                            masteryLocks: record.input_data?.masteryLocks || {},
                                                                            selectedClientId: client.id,
                                                                            activeHistoryId: record.id
                                                                        };
                                                                        sessionStorage.setItem('bcba_session_state', JSON.stringify(stateToSave));
                                                                        navigate(`/bcba-generator?client_id=${client.id}`);
                                                                    }}
                                                                    className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex items-center gap-1 text-neutral-600 dark:text-neutral-300"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">edit</span>
                                                                    Edit Analysis
                                                                </button>
                                                                <div className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-bold px-3 py-1 rounded-lg text-xs">
                                                                    {(record.maladaptives?.length || 0) + (record.replacements?.length || 0)} Behaviors
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                                            {record.maladaptives && record.maladaptives.length > 0 && (
                                                                <div className="bg-red-50/50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100 dark:border-red-900/20">
                                                                    <div className="text-[10px] font-black text-red-600 dark:text-red-400 mb-2 uppercase tracking-wider">Maladaptive Behaviors</div>
                                                                    <div className="space-y-2">
                                                                        {record.maladaptives.map((b: any, i: number) => (
                                                                            <div key={i} className="flex justify-between items-center bg-white dark:bg-neutral-800 p-2 rounded-lg border border-red-100 dark:border-red-900/30">
                                                                                <span className="text-sm text-neutral-700 dark:text-neutral-300 font-medium truncate pr-2">{b.name}</span>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-xs text-neutral-400">Baseline:</span>
                                                                                    <span className="text-sm font-bold text-neutral-900 dark:text-white">{b.baseline}</span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {record.replacements && record.replacements.length > 0 && (
                                                                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                                                                    <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 mb-2 uppercase tracking-wider">Replacement Skills</div>
                                                                    <div className="space-y-2">
                                                                        {record.replacements.map((b: any, i: number) => (
                                                                            <div key={i} className="flex justify-between items-center bg-white dark:bg-neutral-800 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                                                                                <span className="text-sm text-neutral-700 dark:text-neutral-300 font-medium truncate pr-2">{b.name}</span>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-xs text-neutral-400">Baseline:</span>
                                                                                    <span className="text-sm font-bold text-neutral-900 dark:text-white">{b.baseline}</span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ) : <LockedContent title="Weekly Data Locked" moduleName="Weekly Data Analysis" onUpgrade={() => setIsUpgradeModalOpen(true)} />)}


                            </div>
                        )}
                    </div>
                </div>
            </div>

            <NoteModal note={selectedNote} isOpen={!!selectedNote} onClose={() => setSelectedNote(null)} />
        </Layout>
    );
};

const EmptyState = ({ icon, title, desc }: { icon: string, title: string, desc: string }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/20">
        <div className="size-16 bg-white dark:bg-neutral-800 rounded-full flex items-center justify-center shadow-sm mb-4">
            <span className="material-symbols-outlined text-3xl text-neutral-400">{icon}</span>
        </div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">{title}</h3>
        <p className="text-neutral-500 max-w-xs mx-auto text-sm">{desc}</p>
    </div>
);



const LockedContent = ({ title, moduleName, onUpgrade }: { title: string, moduleName: string, onUpgrade: () => void }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/20">
        <div className="size-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl text-neutral-400">lock</span>
        </div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">{title}</h3>
        <p className="text-neutral-500 max-w-md mx-auto mb-6 text-sm">
            This module is restricted. Upgrade your plan to access {moduleName}.
        </p>
        <button
            onClick={onUpgrade}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
        >
            View Upgrade Plans
        </button>
    </div>
);

const NoteModal = ({ note, isOpen, onClose }: { note: any, isOpen: boolean, onClose: () => void }) => {
    if (!isOpen || !note) return null;

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=800,height=600');
        if (printWindow) {
            printWindow.document.write(`
                 <html>
                     <head>
                         <title>Session Note</title>
                         <style>
                             body { font-family: sans-serif; padding: 40px; }
                             h1 { border-bottom: 2px solid #ccc; }
                             pre { white-space: pre-wrap; font-family: inherit; }
                         </style>
                     </head>
                     <body>
                         <h1>Clinical Session Note</h1>
                         <p><strong>Date:</strong> ${new Date(note.created_at).toLocaleString()}</p>
                         <pre>${note.content}</pre>
                     </body>
                 </html>
             `);
            printWindow.document.close();
            printWindow.print();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-surface-dark border border-neutral-800 w-full max-w-2xl rounded-2xl relative z-10 max-h-[80vh] flex flex-col shadow-2xl"
            >
                <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50 rounded-t-2xl">
                    <h3 className="text-xl font-bold text-white">Session Note</h3>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg">
                            <span className="material-symbols-outlined">print</span>
                        </button>
                        <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <div className="prose prose-invert max-w-none text-neutral-300 whitespace-pre-wrap">
                        {note.content}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ClientProfile;

