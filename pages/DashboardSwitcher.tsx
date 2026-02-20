import React, { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import RBTDashboard from './RBTDashboard';
import BCBADashboard from './BCBADashboard';
import AdminDashboard from './AdminDashboard';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import { useConfirm } from '../contexts/ConfirmContext';
import { authApi } from '../lib/api';

const DashboardSwitcher = () => {
    const { user, refreshUser } = useUser();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { showAlert } = useConfirm();
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        const sessionId = searchParams.get('session_id');
        if (sessionId && !showSuccess) {

            // Verify the session actively
            authApi.verifySession(sessionId)
                .then(async (res) => {
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success) {
                            setShowSuccess(true);
                            showAlert('Success', `Payment confirmed! Welcome to the ${data.plan} plan.`, 'success');

                            // Critical: Wait for DB update before refreshing user
                            setTimeout(async () => {
                                await refreshUser();
                                // Clean URL only after success
                                navigate('/', { replace: true });
                            }, 1000);

                            setTimeout(() => setShowSuccess(false), 5000);
                        } else {
                            showAlert('Notice', 'Payment status is: ' + (data.status || 'unknown'), 'info');
                        }
                    } else {
                        const err = await res.json();
                        console.error('Verification failed', err);
                        showAlert('Error', 'Verification failed: ' + (err.error || 'Check console'), 'error');
                    }
                })
                .catch(err => {
                    console.error('Verify error', err);
                    showAlert('Error', 'Failed to verify payment session.', 'error');
                });
        }
    }, [searchParams, navigate, refreshUser, showAlert]);

    if (!user) return null;

    if (showSuccess) {
        // Return a temporary success view or just overlay
        // For now, let's just let it render the dashboard with the alert
    }

    if (user.role === 'admin') {
        return <AdminDashboard />;
    }

    // Unified Dashboard for all users (as requested)
    return <RBTDashboard />;
};

export default DashboardSwitcher;
