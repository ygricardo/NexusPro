import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../contexts/LanguageContext';
import { authApi } from '../lib/api';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

const Settings = () => {
    const { user, refreshUser } = useUser();
    const { t } = useLanguage();
    const { success, error: toastError } = useToast();
    const [loading, setLoading] = useState(false);
    // Removed local message state

    const [formData, setFormData] = useState({
        full_name: '',
        avatar_url: '',
    });

    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [cancelMessage, setCancelMessage] = useState('');
    const [subscriptionDetails, setSubscriptionDetails] = useState<{
        cancel_at_period_end: boolean;
        current_period_end: number;
        cancel_at?: number;
    } | null>(null);

    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.name || '',
                avatar_url: user.avatar || '',
            });
            fetchSubscriptionDetails();
        }
    }, [user]);

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
        setLoading(true);
        try {
            const res = await authApi.getSubscriptionDetails();
            if (res.ok) {
                const data = await res.json();
                if (data.subscription) {
                    const endDate = new Date(data.subscription.current_period_end * 1000);
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
                    // Fallback if no subscription found
                    setCancelMessage('Are you sure you want to cancel? You will lose access at the end of the billing cycle.');
                    setShowCancelDialog(true);
                }
            } else {
                throw new Error('Failed to fetch subscription details');
            }
        } catch (error) {
            console.error('Error fetching subscription:', error);
            // Fallback on error
            setCancelMessage('Are you sure you want to cancel? You will lose access at the end of the billing cycle.');
            setShowCancelDialog(true);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSubscription = async () => {
        setShowCancelDialog(false);
        setLoading(true);
        try {
            const res = await authApi.cancelSubscription();
            if (res.ok) {
                success('Subscription canceled successfully.');
                fetchSubscriptionDetails(); // Refresh status
            } else {
                throw new Error('Failed to cancel');
            }
        } catch (err: any) {
            toastError('Failed to cancel subscription. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResumeSubscription = async () => {
        setLoading(true);
        try {
            const res = await authApi.resumeSubscription();
            if (res.ok) {
                success('Subscription reactivated successfully.');
                fetchSubscriptionDetails(); // Refresh status
            } else {
                throw new Error('Failed to resume');
            }
        } catch (err: any) {
            toastError('Failed to reactivate subscription. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    avatar_url: formData.avatar_url
                })
                .eq('id', user.id);

            if (error) throw error;

            await refreshUser();
            success('Profile updated successfully!');
        } catch (error: any) {
            console.error('Error updating profile:', error);
            toastError(error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                    Settings
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-2">
                    Manage your profile and account preferences.
                </p>
            </header>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden max-w-2xl"
            >
                <div className="p-6 sm:p-8 border-b border-neutral-100 dark:border-neutral-700/50">
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">badge</span>
                        Profile Information
                    </h2>
                </div>

                <div className="p-6 sm:p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Avatar Preview */}
                        <div className="flex items-center gap-6 mb-8">
                            <div className="relative">
                                <div
                                    className="size-20 rounded-full bg-cover bg-center ring-4 ring-neutral-50 dark:ring-neutral-800 shadow-lg"
                                    style={{ backgroundImage: `url("${formData.avatar_url || user?.avatar}")` }}
                                ></div>
                                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-neutral-900 p-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 shadow-sm">
                                    <span className="material-symbols-outlined text-[16px] text-neutral-500">edit</span>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-neutral-900 dark:text-white text-lg">{user?.name}</h3>
                                <p className="text-neutral-500 dark:text-neutral-400 text-sm">{user?.email}</p>
                                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 uppercase tracking-wide">
                                    {user?.role} — {user?.plan.replace('_', ' ')}
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="Your full name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                                    Avatar URL (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.avatar_url}
                                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="https://example.com/avatar.jpg"
                                />
                                <p className="text-xs text-neutral-400 mt-1">
                                    Leave empty to use the default generated avatar.
                                </p>
                            </div>

                            <div className="opacity-60 pointer-events-none">
                                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full px-4 py-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-500"
                                />
                                <p className="text-xs text-neutral-400 mt-1">
                                    Contact support to change your email.
                                </p>
                            </div>
                        </div>



                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 bg-primary hover:bg-red-700 text-white font-semibold rounded-lg shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>

            {/* Subscription Management Section */}
            {user?.plan && user.plan !== 'no_plan' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden max-w-2xl"
                >
                    <div className="p-6 sm:p-8 border-b border-neutral-100 dark:border-neutral-700/50">
                        <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-500">card_membership</span>
                            Subscription Management
                        </h2>
                    </div>

                    <div className="p-6 sm:p-8">
                        <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 mb-6">
                            <div>
                                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Current Plan</p>
                                <p className="text-2xl font-black text-neutral-900 dark:text-white capitalize mt-1">
                                    {user.plan}
                                </p>
                            </div>
                            <div className="size-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                                <span className="material-symbols-outlined text-2xl">verified</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            {subscriptionDetails?.cancel_at_period_end ? (
                                <div className="space-y-4">
                                    <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-lg">
                                        <p className="text-sm text-orange-800 dark:text-orange-200 font-medium flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg">event_busy</span>
                                            Membership Active until
                                            {(subscriptionDetails.current_period_end || subscriptionDetails.cancel_at)
                                                ? ` ${new Date((subscriptionDetails.current_period_end || subscriptionDetails.cancel_at!) * 1000).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`
                                                : ' (Date unavailable)'}
                                        </p>
                                        <p className="text-xs text-orange-600 dark:text-orange-300 mt-1 pl-7">
                                            Access to modules will be revoked after this date.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleResumeSubscription}
                                        disabled={loading}
                                        className="w-full sm:w-auto px-6 py-2.5 bg-secondary hover:bg-secondary/90 text-neutral-900 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined">autorenew</span>
                                        Renew Subscription
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                                        You are currently subscribed to the <strong>{user.plan}</strong> tier.
                                        Canceling your subscription will result in loss of access to all modules at the end of your current billing period.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={handleCancelClick}
                                        disabled={loading}
                                        className="w-full sm:w-auto px-6 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined">cancel</span>
                                        Cancel Subscription
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {showCancelDialog && (
                <ConfirmDialog
                    title="Cancel Subscription?"
                    message={cancelMessage}
                    confirmText="Yes, Cancel Subscription"
                    cancelText="Keep Plan"
                    type="danger"
                    onConfirm={handleCancelSubscription}
                    onCancel={() => setShowCancelDialog(false)}
                />
            )}
        </div>
    );
};

export default Settings;
