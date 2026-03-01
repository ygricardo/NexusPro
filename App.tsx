import React, { useState, useEffect } from 'react'; // HMR trigger
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout.tsx';
import Sidebar from './components/Sidebar.tsx';
import Header from './components/Header.tsx';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import { UserProvider, useUser } from './contexts/UserContext';
import { ToastProvider } from './contexts/ToastContext.tsx';
import { ConfirmProvider } from './contexts/ConfirmContext.tsx';
import { UserPlan } from './types.ts';
import LoadingScreen from './components/LoadingScreen.tsx';
import { supabase } from './lib/supabaseClient';
import { authApi } from './lib/api';

// Pages
import DashboardSwitcher from './pages/DashboardSwitcher.tsx';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import SessionNote from './pages/SessionNote.tsx';
import RBTGenerator from './pages/RBTGenerator.tsx';
import BCBAGenerator from './pages/BCBAGenerator.tsx';

import ClientManager from './pages/ClientManager.tsx';
import ClientProfile from './pages/ClientProfile.tsx';

import { AdminUsers, AdminMembership, AdminLicenses } from './pages/Admin.tsx';
import AdminLogs from './pages/AdminLogs.tsx';
import Unauthorized from './pages/Unauthorized.tsx';
import Plans from './pages/Plans.tsx';
import Settings from './pages/Settings.tsx';
import PlanGuard from './components/PlanGuard.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import AuthCallback from './pages/AuthCallback.tsx';
import OnboardingWizard from './components/OnboardingWizard.tsx';
import HelpCenter from './pages/HelpCenter.tsx';
import TermsOfService from './pages/TermsOfService.tsx';
import PrivacyPolicy from './pages/PrivacyPolicy.tsx';

// Protected Route Component (Unchanged)
interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredModule?: string;
    adminOnly?: boolean;
    allowedRoles?: string[];
}

const ProtectedRoute = ({ children, requiredModule, adminOnly = false, allowedRoles }: ProtectedRouteProps) => {
    const { checkAccess, loading, user } = useUser();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Role-based check
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    const allPlans: UserPlan[] = ['basic', 'advanced', 'elite', 'no_plan'];
    const hasAccess = checkAccess(allPlans, adminOnly, requiredModule);

    if (!hasAccess) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
};

function AppContent() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();

    // Close sidebar on route change on mobile
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };

        // Initial check
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close sidebar automatically on mobile when route changes
    useEffect(() => {
        if (window.innerWidth < 1024) {
            setSidebarOpen(false);
        }
    }, [location]);

    const isPublicRoute = ['/login', '/register', '/unauthorized', '/auth/callback', '/terms', '/privacy'].includes(location.pathname);


    return (
        <div className="flex h-screen text-white overflow-hidden transition-colors duration-300">
            {!isPublicRoute && (
                <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
            )}

            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {!isPublicRoute && (
                    <Header sidebarOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
                )}

                {/* Onboarding wizard — self-manages visibility per first-login detection */}
                {!isPublicRoute && <OnboardingWizard />}

                <main className={`flex-1 overflow-x-hidden overflow-y-auto scroll-smooth ${!isPublicRoute ? 'p-4 md:p-6' : ''}`}>
                    <Routes>
                        <Route path="/" element={
                            <ProtectedRoute>
                                <DashboardSwitcher />
                            </ProtectedRoute>
                        } />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/auth/callback" element={<AuthCallback />} />

                        <Route path="/dashboard" element={<Navigate to="/" replace />} />

                        <Route path="/start-session" element={<Navigate to="/session-note" replace />} />
                        <Route path="/session-note" element={
                            <ErrorBoundary moduleName="Note Generator">
                                <PlanGuard requiredModule="note_generator">
                                    <SessionNote />
                                </PlanGuard>
                            </ErrorBoundary>
                        } />

                        <Route path="/rbt-generator" element={
                            <ErrorBoundary moduleName="Daily Data (RBT)">
                                <PlanGuard requiredModule="rbt_generator">
                                    <RBTGenerator />
                                </PlanGuard>
                            </ErrorBoundary>
                        } />

                        <Route path="/bcba-generator" element={
                            <ErrorBoundary moduleName="Weekly Data (BCBA)">
                                <PlanGuard requiredModule="bcba_generator">
                                    <BCBAGenerator />
                                </PlanGuard>
                            </ErrorBoundary>
                        } />

                        <Route path="/caseload" element={
                            <ProtectedRoute>
                                <ClientManager />
                            </ProtectedRoute>
                        } />

                        {/* Client Profile Route */}
                        <Route path="/clients/:id" element={
                            <ProtectedRoute>
                                <ClientProfile />
                            </ProtectedRoute>
                        } />



                        <Route path="/admin" element={<Navigate to="/admin-users" replace />} />
                        <Route path="/admin-users" element={
                            <ProtectedRoute adminOnly>
                                <AdminUsers />
                            </ProtectedRoute>
                        } />
                        <Route path="/admin-membership" element={
                            <ProtectedRoute adminOnly>
                                <AdminMembership />
                            </ProtectedRoute>
                        } />
                        <Route path="/admin-licenses" element={
                            <ProtectedRoute adminOnly>
                                <AdminLicenses />
                            </ProtectedRoute>
                        } />
                        <Route path="/admin-logs" element={
                            <ProtectedRoute adminOnly>
                                <AdminLogs />
                            </ProtectedRoute>
                        } />

                        {/* Public Plans Route */}
                        <Route path="/plans" element={<Plans />} />

                        <Route path="/settings" element={
                            <ProtectedRoute>
                                <Settings />
                            </ProtectedRoute>
                        } />

                        <Route path="/help" element={
                            <ProtectedRoute>
                                <HelpCenter />
                            </ProtectedRoute>
                        } />

                        <Route path="/unauthorized" element={<Unauthorized />} />
                        <Route path="/terms" element={<TermsOfService />} />
                        <Route path="/privacy" element={<PrivacyPolicy />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}

function App() {
    // Protect Supabase Auth from React HashRouter destroying the token immediately
    const [routerReady, setRouterReady] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    useEffect(() => {
        const checkHash = async () => {
            const hash = window.location.hash;
            if (hash && (hash.includes('access_token=') || hash.includes('provider_token='))) {
                console.log('App: OAuth callback detected. Forcing sync before router mount...');

                // Let Supabase parse the token from the URL
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError || !session) {
                    setSyncError(`Supabase error: ${sessionError?.message || 'No session found'}`);
                    setTimeout(() => setRouterReady(true), 3000);
                    return;
                }

                // Perform background sync with NexusPro backend
                try {
                    const response = await authApi.syncSession(session.access_token);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.token) {
                            console.log('App: Successfully synced OAuth session to Nexus Token');
                            localStorage.setItem('nexus_token', data.token);
                            // Clear hash manually so HashRouter starts clean at /
                            window.location.hash = '#/';
                        } else {
                            setSyncError('Backend returned ok, but no nexus_token found.');
                        }
                    } else {
                        const text = await response.text();
                        setSyncError(`Backend rejected token sync [${response.status}]: ${text}`);
                    }
                } catch (error: any) {
                    setSyncError(`Network error during sync: ${error.message}`);
                }

                // Release the hold on the router
                setRouterReady(true);
            } else {
                setRouterReady(true);
            }
        };

        checkHash();
    }, []);

    if (!routerReady || syncError) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-midnight overflow-hidden">
                <div className="flex flex-col items-center justify-center p-8 max-w-lg text-center z-10">
                    {!syncError && (
                        <>
                            <span className="material-symbols-outlined animate-spin text-5xl text-primary mb-6 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">progress_activity</span>
                            <h2 className="text-2xl font-black tracking-tighter text-white mb-2">Securing connection...</h2>
                            <p className="text-blue-200/60 font-medium">Synchronizing Google OAuth session with NexusPro keys.</p>
                        </>
                    )}
                    {syncError && (
                        <>
                            <div className="size-16 rounded-2xl bg-danger/20 flex items-center justify-center mb-6">
                                <span className="material-symbols-outlined text-danger text-3xl">error</span>
                            </div>
                            <h2 className="text-2xl font-black text-white mb-2">Authentication Error</h2>
                            <p className="text-blue-200/60 mb-6">The system could not validate your Google sign-in.</p>
                            <div className="bg-black/40 border border-white/10 rounded-xl p-4 w-full">
                                <p className="text-danger/80 font-mono text-xs text-left whitespace-pre-wrap word-break-all break-all">{syncError}</p>
                            </div>
                            <button onClick={() => setRouterReady(true)} className="mt-8 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-bold text-sm">
                                Continue to Login
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <Router>
            <LanguageProvider>
                <UserProvider>
                    <ToastProvider>
                        <ConfirmProvider>
                            <AppContent />
                        </ConfirmProvider>
                    </ToastProvider>
                </UserProvider>
            </LanguageProvider>
        </Router>
    );
};

export default App;