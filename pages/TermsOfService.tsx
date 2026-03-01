import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const TermsOfService = () => {
    return (
        <div className="min-h-screen bg-midnight text-white font-display">
            <div className="max-w-4xl mx-auto px-6 py-16">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <Link to="/register" className="inline-flex items-center gap-2 text-primary hover:text-cyan-300 transition-colors mb-8 text-sm font-bold">
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        Back
                    </Link>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="size-12 rounded-2xl bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined text-[24px]">hub</span>
                        </div>
                        <span className="text-2xl font-black tracking-tighter">NexusPro</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-white mb-2">Terms of Service</h1>
                    <p className="text-white/50 text-sm">Last updated: March 1, 2026</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-10 text-white/80 leading-relaxed"
                >
                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
                        <p>By accessing or using NexusPro ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Service. These terms apply to all users, including clinicians, supervisors, and administrators.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">2. Description of Service</h2>
                        <p>NexusPro is a clinical documentation and data management platform designed for Applied Behavior Analysis (ABA) professionals. The Service provides tools for session note generation, behavioral data recording, client management, and AI-assisted documentation.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">3. User Accounts</h2>
                        <ul className="space-y-2 list-disc list-inside">
                            <li>You must provide accurate and complete information when creating an account.</li>
                            <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
                            <li>You must notify us immediately of any unauthorized access to your account.</li>
                            <li>One account per user. Sharing accounts is prohibited.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">4. Subscription and Billing</h2>
                        <p className="mb-3">NexusPro operates on a subscription model with three tiers: Basic, Advanced, and Elite. By subscribing, you agree to:</p>
                        <ul className="space-y-2 list-disc list-inside">
                            <li>Pay the applicable monthly fees for your selected plan.</li>
                            <li>Automatic renewal unless you cancel before the end of the billing period.</li>
                            <li>No refunds for partial subscription periods.</li>
                            <li>Immediate access revocation upon subscription cancellation after the period ends.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">5. AI-Generated Content</h2>
                        <p>NexusPro uses artificial intelligence (powered by Google Gemini) to assist in generating clinical documentation. <strong className="text-white">You are solely responsible for reviewing, verifying, and approving all AI-generated content before use in clinical settings.</strong> AI outputs are drafts and must not be used as final clinical records without professional review.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">6. Prohibited Uses</h2>
                        <p className="mb-3">You may not use the Service to:</p>
                        <ul className="space-y-2 list-disc list-inside">
                            <li>Store, transmit, or process Protected Health Information (PHI) in violation of HIPAA.</li>
                            <li>Reverse engineer, decompile, or attempt to extract source code.</li>
                            <li>Use the platform for any unlawful purpose.</li>
                            <li>Share, resell, or sublicense access to third parties.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">7. Limitation of Liability</h2>
                        <p>NexusPro is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, or consequential damages arising from the use of the Service, including any errors in AI-generated content used in clinical practice.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">8. Termination</h2>
                        <p>We reserve the right to suspend or terminate accounts that violate these terms, with or without notice. Upon termination, your access to the Service and all associated data may be permanently removed.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">9. Changes to Terms</h2>
                        <p>We may update these Terms of Service from time to time. Continued use of the Service after changes constitutes acceptance of the updated terms. We will notify users of significant changes via email.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">10. Contact</h2>
                        <p>For questions about these Terms, contact us at: <a href="mailto:legal@nexuspro.ai" className="text-primary hover:text-cyan-300 transition-colors">legal@nexuspro.ai</a></p>
                    </section>
                </motion.div>

                <div className="mt-16 pt-8 border-t border-white/10 flex gap-6 text-sm text-white/40">
                    <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                    <Link to="/terms" className="text-white/60">Terms of Service</Link>
                    <a href="mailto:support@nexuspro.ai" className="hover:text-white transition-colors">Contact Support</a>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
