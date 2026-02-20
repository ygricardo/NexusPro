import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import LoadingScreen from './LoadingScreen';

interface PlanGuardProps {
    children: React.ReactNode;
    requiredModule?: string;
}

const PlanGuard = ({ children, requiredModule }: PlanGuardProps) => {
    const { user, loading, checkAccess } = useUser();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Admin bypasses everything
    if (user.role === 'admin') {
        return <>{children}</>;
    }

    // Check plan access
    const hasAccess = checkAccess([], false, requiredModule);

    if (!hasAccess) {
        // If user has no plan, send them to plans page
        if (user.plan === 'no_plan') {
            return <Navigate to="/plans" replace />;
        }

        // Otherwise, they might have a plan but not for this module
        return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
};

export default PlanGuard;
