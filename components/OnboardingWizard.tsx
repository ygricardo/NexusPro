import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const STORAGE_KEY = 'nexuspro_onboarding_done';

const steps = [
    {
        icon: 'groups',
        iconColor: 'text-blue-400',
        title: 'Welcome to NexusPro! 👋',
        description: 'Your AI-powered clinical documentation platform. Complete these three quick steps to unlock your full workflow.',
        action: 'Add Your First Client',
        actionLink: '/clients',
        step: 1,
    },
    {
        icon: 'edit_note',
        iconColor: 'text-green-400',
        title: 'Generate Your First Note',
        description: 'Use the RBT or BCBA generators to create a clinical session note in seconds. Select a client, enter data, and let the AI do the work.',
        action: 'Go to RBT Generator',
        actionLink: '/rbt-generator',
        step: 2,
    },
    {
        icon: 'credit_card',
        iconColor: 'text-purple-400',
        title: 'Choose Your Plan',
        description: 'Unlock unlimited note generation, PDF exports, and priority support. Start with a free trial or select a plan that fits your practice.',
        action: 'View Plans',
        actionLink: '/plans',
        step: 3,
    },
];

const OnboardingWizard: React.FC = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!user) return;
        const done = localStorage.getItem(STORAGE_KEY);
        if (!done) {
            // Small delay so the app renders first
            const timer = setTimeout(() => setVisible(true), 800);
            return () => clearTimeout(timer);
        }
    }, [user]);

    const handleDismiss = () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        setVisible(false);
    };

    const handleAction = (link: string) => {
        navigate(link);
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleDismiss();
        }
    };

    const step = steps[currentStep];

    return (
        <AnimatePresence>
            {visible && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleDismiss}
                    />
                    {/* Card */}
                    <motion.div
                        key="wizard"
                        className="fixed inset-0 flex items-center justify-center z-[101] p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl max-w-md w-full p-8 relative overflow-hidden"
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        >
                            {/* Decorative gradient blob */}
                            <div className="absolute -top-12 -right-12 size-40 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

                            {/* Close button */}
                            <button
                                onClick={handleDismiss}
                                className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-white transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>

                            {/* Step indicator */}
                            <div className="flex gap-1.5 mb-6">
                                {steps.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1 rounded-full transition-all duration-300 ${i === currentStep
                                            ? 'bg-blue-500 flex-1'
                                            : i < currentStep
                                                ? 'bg-blue-300 w-6'
                                                : 'bg-neutral-200 dark:bg-neutral-700 w-6'
                                            }`}
                                    />
                                ))}
                            </div>

                            {/* Icon */}
                            <div className="size-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                                <span className={`material-symbols-outlined text-4xl ${step.iconColor}`}>{step.icon}</span>
                            </div>

                            {/* Content */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">{step.title}</h2>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6">{step.description}</p>
                                </motion.div>
                            </AnimatePresence>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDismiss}
                                    className="flex-1 px-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                                >
                                    Skip for now
                                </button>
                                <button
                                    onClick={() => handleAction(step.actionLink)}
                                    className="flex-1 px-4 py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                                >
                                    {step.action}
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </button>
                            </div>

                            {/* Step counter */}
                            <p className="text-center text-[10px] text-neutral-400 mt-4 font-mono">
                                Step {currentStep + 1} of {steps.length}
                            </p>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default OnboardingWizard;
