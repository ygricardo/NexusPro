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

    const isPublicRoute = ['/login', '/register', '/unauthorized', '/auth/callback'].includes(location.pathname);


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

                        <Route path="/unauthorized" element={<Unauthorized />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}

function App() {
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