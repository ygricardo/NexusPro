import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import DOMPurify from 'dompurify'; // Ensure this is installed, or we can use another method if not.

interface FAQ {
    questionKey: string;
    answerKey: string;
}

const faqs: FAQ[] = [
    {
        questionKey: 'faq_1_q',
        answerKey: 'faq_1_a',
    },
    {
        questionKey: 'faq_2_q',
        answerKey: 'faq_2_a',
    },
    {
        questionKey: 'faq_4_q',
        answerKey: 'faq_4_a',
    }
];

const HelpCenter = () => {
    const { t } = useLanguage();
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

    const toggleFaq = (index: number) => {
        setOpenFaqIndex(openFaqIndex === index ? null : index);
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white flex items-center gap-3">
                        <span className="material-symbols-outlined text-4xl text-cyan-400">help_center</span>
                        {t('help_center_title')}
                    </h1>
                    <p className="text-white/60 mt-1 max-w-2xl text-sm md:text-base">
                        {t('help_center_desc')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* FAQ Section (Takes up 2/3 width on large screens) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="glass p-6 rounded-3xl border border-white/10 relative overflow-hidden h-full">
                        {/* Background glow */}
                        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/20 rounded-full blur-[100px] opacity-50 pointer-events-none" />

                        <div className="relative z-10">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-cyan-400">quiz</span>
                                {t('faq_title')}
                            </h2>

                            <div className="space-y-3">
                                {faqs.map((faq, index) => {
                                    const isOpen = openFaqIndex === index;
                                    return (
                                        <div
                                            key={index}
                                            className={cn(
                                                "border border-white/5 rounded-2xl overflow-hidden transition-all duration-300",
                                                isOpen ? "bg-white/10 shadow-lg border-white/20" : "bg-black/20 hover:bg-white/5"
                                            )}
                                        >
                                            <button
                                                onClick={() => toggleFaq(index)}
                                                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 focus:outline-none"
                                            >
                                                <span className="font-semibold text-white/90">{t(faq.questionKey)}</span>
                                                <span className={cn(
                                                    "material-symbols-outlined text-white/50 transition-transform duration-300 flex-shrink-0",
                                                    isOpen ? "rotate-180 text-cyan-400" : ""
                                                )}>
                                                    expand_more
                                                </span>
                                            </button>

                                            <AnimatePresence>
                                                {isOpen && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                                    >
                                                        <div className="px-5 pb-4 text-white/70 text-sm leading-relaxed whitespace-pre-line border-t border-white/5 pt-3">
                                                            {/* Using dangerouslySetInnerHTML to allow bolding via basic HTML if translation includes it */}
                                                            <div dangerouslySetInnerHTML={{ __html: t(faq.answerKey) }} />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact Support Section */}
                <div className="space-y-4">
                    <div className="glass p-6 rounded-3xl border border-white/10 relative overflow-hidden flex flex-col h-full">
                        {/* Background glow */}
                        <div className="absolute -bottom-20 -right-20 w-[250px] h-[250px] bg-cyan-500/20 rounded-full blur-[80px] pointer-events-none" />

                        <div className="relative z-10 flex-1 flex flex-col">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-cyan-400/20 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
                                <span className="material-symbols-outlined text-3xl text-cyan-400">support_agent</span>
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-2">
                                {t('need_more_help')}
                            </h2>
                            <p className="text-white/60 mb-6 flex-1 text-sm md:text-base">
                                {t('support_desc')}
                            </p>

                            <a
                                href="mailto:support@nexuspro.ai?subject=Support%20Request%20-%20NexusPro"
                                className="w-full group relative overflow-hidden rounded-xl p-[1px] inline-block"
                            >
                                <span className="absolute inset-0 bg-gradient-to-r from-primary via-cyan-400 to-primary rounded-xl opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
                                <div className="relative bg-midnight/90 backdrop-blur-sm px-6 py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 group-hover:bg-midnight/50">
                                    <span className="material-symbols-outlined text-cyan-400">mail</span>
                                    <span className="font-bold text-white group-hover:text-cyan-100">{t('contact_support_btn')}</span>
                                </div>
                            </a>

                            <div className="mt-4 flex items-center gap-2 text-xs text-white/40 justify-center">
                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                                {t('support_hours')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Resources or Guides Section (Optional Placeholder for Future) */}
            <div className="glass p-8 rounded-3xl border border-white/10 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 justify-between text-center md:text-left">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center justify-center md:justify-start gap-2 mb-2">
                            <span className="material-symbols-outlined text-primary">gavel</span>
                            Legal & Privacy
                        </h3>
                        <p className="text-white/60 text-sm max-w-xl">
                            Review our Terms of Service and Privacy Policy to understand how your data is protected.
                        </p>
                    </div>
                    <div className="flex gap-3 shrink-0 flex-wrap justify-center">
                        <a
                            href="/#/terms"
                            className="px-5 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-sm flex items-center gap-2 hover:bg-primary/20 transition-all"
                        >
                            <span className="material-symbols-outlined text-lg">description</span>
                            Terms of Service
                        </a>
                        <a
                            href="/#/privacy"
                            className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-bold text-sm flex items-center gap-2 hover:bg-white/10 transition-all"
                        >
                            <span className="material-symbols-outlined text-lg">shield</span>
                            Privacy Policy
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpCenter;
