import { useToast } from '../contexts/ToastContext';
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { authApi } from '../lib/api';
import { loadStripe } from '@stripe/stripe-js';
import { AnimatePresence, motion } from 'framer-motion';
import ConfirmDialog from '../components/ConfirmDialog';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const Plans = () => {
    const { t } = useLanguage();
    const { user } = useUser();
    const { success, error: toastError } = useToast();
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPlan, setCurrentPlan] = useState<string | null>(null);
    const [processing, setProcessing] = useState<string | null>(null);
    const [subscriptionLoading, setSubscriptionLoading] = useState(false);

    // Subscription Management State
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [cancelMessage, setCancelMessage] = useState('');
    const [subscriptionDetails, setSubscriptionDetails] = useState<{
        cancel_at_period_end: boolean;
        current_period_end: number;
        cancel_at?: number;
    } | null>(null);





    useEffect(() => {
        fetchPlans();
        if (user) {
            fetchUserPlan();
            setSubscriptionLoading(true);
            fetchSubscriptionDetails().then(() => setSubscriptionLoading(false));
        }
    }, [user]);

    const fetchPlans = async () => {
        // Mock Plans Data
        const mockPlans = [
            {
                id: 'basic',
                name: 'Basic',
                price: 19.99,
                features: ['Client Caseload Management (Add/Delete)', 'Daily Data Generator Access'],
                color: 'neutral'
            },
            {
                id: 'advanced',
                name: 'Advanced',
                price: 49.99,
                features: ['All Basic Features', 'Weekly Data Generator Access'],
                color: 'primary'
            },
            {
                id: 'elite',
                name: 'Elite',
                price: 69.99,
                features: ['All Advanced Features', 'Note Generator Access'],
                color: 'secondary'
            }
        ];
        setPlans(mockPlans);
        setLoading(false);
    };

    const fetchSubscriptionDetails = async () => {
        try {
            const res = await authApi.getSubscriptionDetails();
            if (res.ok) {
                const data = await res.json();
                if (data.subscription) {
                    setSubscriptionDetails(data.subscription);
                }
            }
        } catch (error) {
            console.error('Error fetching subscription details:', error);
        }
    };

    const handleCancelClick = async () => {
        setProcessing('cancel');
        try {
            const res = await authApi.getSubscriptionDetails();
            if (res.ok) {
                const data = await res.json();
                if (data.subscription) {
                    const endDate = new Date((data.subscription.current_period_end || data.subscription.cancel_at) * 1000);
                    const now = new Date();
                    const diffTime = endDate.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    const formattedDate = endDate.toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });

                    setCancelMessage(
                        `Are you sure you want to cancel? You will lose access to all modules at the end of the billing cycle.\n\nYour membership will remain active until ${formattedDate} (${diffDays} days remaining).`
                    );
                    setShowCancelDialog(true);
                } else {
                    setCancelMessage('Are you sure you want to cancel? You will lose access at the end of the billing cycle.');
                    setShowCancelDialog(true);
                }
            }
        } catch (error) {
            console.error('Error fetching subscription:', error);
            setCancelMessage('Are you sure you want to cancel? You will lose access at the end of the billing cycle.');
            setShowCancelDialog(true);
        } finally {
            setProcessing(null);
        }
    };

    const handleCancelSubscription = async () => {
        setShowCancelDialog(false);
        setProcessing('cancelling');
        try {
            const res = await authApi.cancelSubscription();
            if (res.ok) {
                success('Subscription canceled successfully.');
                fetchSubscriptionDetails();
            } else {
                throw new Error('Failed to cancel');
            }
        } catch (err: any) {
            toastError('Failed to cancel subscription.');
        } finally {
            setProcessing(null);
        }
    };

    const handleResumeSubscription = async () => {
        setProcessing('resuming');
        try {
            const res = await authApi.resumeSubscription();
            if (res.ok) {
                success('Subscription reactivated successfully.');
                fetchSubscriptionDetails();
            } else {
                throw new Error('Failed to resume');
            }
        } catch (err: any) {
            toastError('Failed to reactivate subscription.');
        } finally {
            setProcessing(null);
        }
    };

    const fetchUserPlan = async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
        if (data) setCurrentPlan(data.plan);
    };

    const handleSubscribe = async (priceId: string) => {
        setProcessing(priceId);
        try {
            console.log('DEBUG: handleSubscribe', { currentPlan, subscriptionDetails, priceId });

            // Validate against Global State first to match UI
            if (!user) {
                if (confirm('Debes iniciar sesión para suscribirte. ¿Ir al login ahora?')) {
                    window.location.href = '/#/login';
                }
                setProcessing(null);
                return;
            }

            // If user has an active plan (and is not canceled), UPDATE subscription directly
            if (currentPlan && currentPlan !== 'no_plan' && subscriptionDetails) {
                if (!subscriptionDetails.cancel_at_period_end) {
                    console.log('DEBUG: Updating Subscription directly');
                    const response = await authApi.updateSubscription(priceId);

                    if (response.ok) {
                        const data = await response.json();

                        if (data.invoiceUrl) {
                            window.location.href = data.invoiceUrl;
                            return;
                        }

                        success(`Plan updated to ${plans.find(p => p.id === priceId)?.name}!`);
                        // Refresh data
                        await fetchUserPlan();
                        await fetchSubscriptionDetails();
                        return;
                    } else {
                        const err = await response.json();
                        console.error('Update Error:', err);
                        toastError(`Failed to update plan: ${err.error || 'Unknown error'}`);
                        return;
                    }
                }
            }

            console.log('DEBUG: Creating Checkout Session');
            // Otherwise, create standard checkout session
            const response = await authApi.createCheckoutSession(priceId, 'month');

            if (!response.ok) {
                const err = await response.json();
                toastError(`API Error: ${err.message || 'Failed to create checkout session'}`);
                return;
            }

            const { url } = await response.json();

            if (url) {
                window.open(url, '_blank');
            } else {
                toastError('Error: No checkout URL received from server');
            }

        } catch (error: any) {
            console.error('Subscription Error:', error);
            toastError(`Subscription Error: ${error.message}`);
        } finally {
            setProcessing(null);
        }
    };

    return (
        <Layout>
            <div className="space-y-8 animate-fade-in-up">
                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black tracking-tighter text-white">
                        Upgrade your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-300">Potential</span>
                    </h1>
                    <p className="text-lg text-blue-200/60 max-w-2xl mx-auto">
                        Choose the plan that fits your clinical needs. Unlock advanced AI analytics, unlimited clients, and automated reporting.
                    </p>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
                    {plans.map((plan) => (
                        <div key={plan.id} className="glass-card relative rounded-3xl p-8 hover:scale-[1.02] transition-transform duration-300 border border-white/10 flex flex-col">
                            {/* Best Value Badge */}
                            {plan.name === 'Advanced' && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-secondary to-yellow-400 text-neutral-900 text-xs font-black uppercase tracking-widest rounded-full shadow-glow-yellow">
                                    Best Value
                                </div>
                            )}

                            <div className="mb-8 text-center">
                                <h3 className={`text-2xl font-black mb-2 ${plan.color === 'secondary' ? 'text-secondary' : 'text-primary'}`}>{plan.name}</h3>
                                <div className="flex items-end justify-center gap-1">
                                    <span className="text-5xl font-black text-white">${plan.price}</span>
                                    <span className="text-blue-200/60 font-medium mb-1">/month</span>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4 mb-8">
                                {plan.features.map((feature: string, index: number) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <div className={`size-6 rounded-full flex items-center justify-center shrink-0 ${plan.color === 'secondary' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                                            <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                                        </div>
                                        <span className="text-blue-100/80 font-medium text-sm">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col gap-2 w-full">
                                {currentPlan === plan.id && subscriptionDetails?.cancel_at_period_end && (
                                    <div className="text-center mb-2">
                                        <p className="text-xs text-orange-400 font-bold uppercase tracking-wider">
                                            Exp: {(subscriptionDetails.current_period_end || subscriptionDetails.cancel_at)
                                                ? new Date((subscriptionDetails.current_period_end || subscriptionDetails.cancel_at!) * 1000).toLocaleDateString('es-ES')
                                                : ''}
                                        </p>
                                    </div>
                                )}
                                <button
                                    onClick={() => {
                                        if (currentPlan === plan.id) {
                                            if (subscriptionDetails?.cancel_at_period_end) {
                                                handleResumeSubscription();
                                            } else {
                                                handleCancelClick();
                                            }
                                        } else {
                                            handleSubscribe(plan.id);
                                        }
                                    }}
                                    disabled={!!processing || (currentPlan === plan.id && (subscriptionLoading || (!subscriptionDetails?.cancel_at_period_end && processing === 'cancel')))}
                                    className={`w-full py-4 rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                                        ${currentPlan === plan.id
                                            ? subscriptionLoading
                                                ? 'bg-white/5 text-white/50 border border-white/10' // Neutral Loading Logic
                                                : subscriptionDetails?.cancel_at_period_end
                                                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20' // Renew style (Green)
                                                    : 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20' // Cancel style
                                            : plan.color === 'secondary'
                                                ? 'bg-gradient-to-r from-secondary to-yellow-500 text-neutral-900 shadow-secondary/20 hover:shadow-secondary/40'
                                                : 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-primary/20 hover:shadow-primary/40'
                                        }`}
                                >
                                    {(subscriptionLoading && currentPlan === plan.id) || processing === plan.id || processing === 'resuming' || processing === 'cancelling' ? (
                                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                    ) : currentPlan === plan.id ? (
                                        subscriptionDetails?.cancel_at_period_end ? (
                                            <>
                                                <span className="material-symbols-outlined">autorenew</span>
                                                Renew Subscription
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined">cancel</span>
                                                Cancel Membership
                                            </>
                                        )
                                    ) : (
                                        <>
                                            <span>Select {plan.name}</span>
                                            <span className="material-symbols-outlined">arrow_forward</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {showCancelDialog && (
                    <ConfirmDialog
                        title="Cancel Membership?"
                        message={cancelMessage}
                        confirmText="Yes, Cancel"
                        cancelText="Keep Plan"
                        type="danger"
                        onConfirm={handleCancelSubscription}
                        onCancel={() => setShowCancelDialog(false)}
                    />
                )}
            </div>
        </Layout>
    );
};

export default Plans;