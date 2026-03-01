import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const PrivacyPolicy = () => {
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
                    <h1 className="text-4xl font-black tracking-tighter text-white mb-2">Privacy Policy</h1>
                    <p className="text-white/50 text-sm">Last updated: March 1, 2026</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-10 text-white/80 leading-relaxed"
                >
                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">1. Information We Collect</h2>
                        <p className="mb-3">NexusPro collects the following categories of information:</p>
                        <ul className="space-y-2 list-disc list-inside">
                            <li><strong className="text-white">Account Information:</strong> Name, email address, and password (encrypted).</li>
                            <li><strong className="text-white">Clinical Data:</strong> Session notes, behavioral data records, and client files you create within the platform.</li>
                            <li><strong className="text-white">Billing Information:</strong> Processed securely by Stripe. We do not store credit card numbers.</li>
                            <li><strong className="text-white">Usage Data:</strong> Logs of features used, timestamps, and system events for security and audit purposes.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">2. How We Use Your Information</h2>
                        <ul className="space-y-2 list-disc list-inside">
                            <li>To provide, maintain, and improve the Service.</li>
                            <li>To process subscription payments via Stripe.</li>
                            <li>To send important account notifications (security alerts, billing reminders).</li>
                            <li>To generate AI-assisted documentation using the Gemini API (processed server-side only).</li>
                            <li>To maintain audit logs for security and compliance purposes.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">3. Data Storage and Security</h2>
                        <p className="mb-3">All data is stored in Supabase (PostgreSQL) with the following protections:</p>
                        <ul className="space-y-2 list-disc list-inside">
                            <li>Row-Level Security (RLS) policies enforced at the database level — users can only access their own data.</li>
                            <li>All traffic is encrypted in transit via HTTPS/TLS.</li>
                            <li>Passwords are hashed using bcrypt. We never store plain-text passwords.</li>
                            <li>API keys and secrets are stored as environment variables, never in client-side code.</li>
                            <li>Admin-level audit logs track all data modifications.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">4. Third-Party Services</h2>
                        <p className="mb-3">NexusPro integrates the following third-party services:</p>
                        <ul className="space-y-2 list-disc list-inside">
                            <li><strong className="text-white">Supabase</strong> — Database and authentication. Hosted on AWS infrastructure.</li>
                            <li><strong className="text-white">Stripe</strong> — Payment processing. Subject to <a href="https://stripe.com/privacy" target="_blank" className="text-primary hover:text-cyan-300">Stripe's Privacy Policy</a>.</li>
                            <li><strong className="text-white">Google Gemini API</strong> — AI note generation. Prompts are processed server-side and not stored by Google for training by default.</li>
                            <li><strong className="text-white">Google OAuth</strong> — Optional sign-in method. Subject to Google's Privacy Policy.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">5. Data Retention</h2>
                        <p>Your data is retained for as long as your account is active. Upon account deletion, your personal data and clinical records will be permanently deleted within 30 days, except where required to retain for legal or compliance obligations.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">6. Your Rights</h2>
                        <ul className="space-y-2 list-disc list-inside">
                            <li><strong className="text-white">Access:</strong> Request a copy of all data we hold about you.</li>
                            <li><strong className="text-white">Correction:</strong> Update incorrect personal information via Settings.</li>
                            <li><strong className="text-white">Deletion:</strong> Request permanent deletion of your account and data.</li>
                            <li><strong className="text-white">Portability:</strong> Export your clinical records in available formats.</li>
                        </ul>
                        <p className="mt-3">To exercise these rights, contact us at <a href="mailto:privacy@nexuspro.ai" className="text-primary hover:text-cyan-300 transition-colors">privacy@nexuspro.ai</a>.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">7. Clinical Data and HIPAA Notice</h2>
                        <p>NexusPro is a documentation tool designed to assist ABA professionals. <strong className="text-white">Users are solely responsible for ensuring their use of the platform complies with HIPAA and other applicable regulations.</strong> We strongly advise against storing directly identifiable Protected Health Information (PHI) such as full names, dates of birth, or Social Security Numbers in free-text fields. Use client initials or codes where possible.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">8. Cookies</h2>
                        <p>NexusPro uses only essential cookies and browser local storage (for session tokens). We do not use tracking or advertising cookies.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">9. Changes to This Policy</h2>
                        <p>We may update this Privacy Policy periodically. We will notify you of significant changes via email. Continued use of the Service after notification constitutes acceptance of the updated policy.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">10. Contact</h2>
                        <p>For privacy-related questions or requests: <a href="mailto:privacy@nexuspro.ai" className="text-primary hover:text-cyan-300 transition-colors">privacy@nexuspro.ai</a></p>
                    </section>
                </motion.div>

                <div className="mt-16 pt-8 border-t border-white/10 flex gap-6 text-sm text-white/40">
                    <Link to="/privacy" className="text-white/60">Privacy Policy</Link>
                    <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                    <a href="mailto:support@nexuspro.ai" className="hover:text-white transition-colors">Contact Support</a>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
