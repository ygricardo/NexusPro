import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useConfirm } from '../contexts/ConfirmContext';

const Register = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { signUp } = useUser();
    const { showAlert } = useConfirm();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [roleType, setRoleType] = useState<'rbt' | 'bcba'>('rbt');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
            <main className="flex flex-1 flex-col items-center justify-center p-4 py-12 relative">
                <div className="relative w-full max-w-[480px] bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden z-10 flex flex-col">
                    <div className="p-8 flex flex-col gap-6">
                        <div className="flex flex-col gap-2 text-center md:text-left">
                            <h1 className="text-neutral-900 dark:text-white text-3xl font-bold leading-tight">Create Account</h1>
                            <p className="text-neutral-500 dark:text-neutral-400 text-sm font-normal leading-normal">Join to access your secure ABA dashboard.</p>
                        </div>
                        <form className="flex flex-col gap-5" onSubmit={async (e) => {
                            e.preventDefault();
                            setError('');
                            setLoading(true);

                            // Default to 'user' role and 'starter' plan
                            const searchParams = new URLSearchParams(location.search);
                            // Valid plans: basic, advanced, elite. Default to basic if invalid or missing.
                            // We now strictly use the standardized plan names.
                            const validPlans = ['basic', 'advanced', 'elite'];
                            const planParam = searchParams.get('plan');
                            const plan = validPlans.includes(planParam || '') ? planParam || 'basic' : 'basic';
                            const role = 'user';

                            // Call signUp
                            const sanitizedEmail = email.trim();
                            const { error } = await signUp(sanitizedEmail, password, fullName, role, plan);

                            setLoading(false);
                            if (error) {
                                setError(error.message);
                            } else {
                                await showAlert('Success', 'Account Created! You can now login.', 'success');
                                navigate('/login');
                            }
                        }}>
                            {error && <div className="text-red-500 text-sm">{error}</div>}

                            <div className="hidden">
                                {/* Role Selection Removed - Defaulting to Starter Plan */}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-neutral-900 dark:text-white text-base font-medium leading-normal">Full Name</label>
                                <input
                                    className="form-input flex w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 h-12 px-4 text-neutral-900 dark:text-white outline-none focus:border-primary transition-colors"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-neutral-900 dark:text-white text-base font-medium leading-normal">Email</label>
                                <input
                                    className="form-input flex w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 h-12 px-4 text-neutral-900 dark:text-white outline-none focus:border-primary transition-colors"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-neutral-900 dark:text-white text-base font-medium leading-normal">Password</label>
                                <input
                                    className="form-input flex w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 h-12 px-4 text-neutral-900 dark:text-white outline-none focus:border-primary transition-colors"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <button disabled={loading} className="mt-2 flex w-full cursor-pointer items-center justify-center rounded-lg h-12 px-4 bg-primary hover:bg-red-700 text-white text-base font-bold leading-normal shadow-lg shadow-primary/20 transition-all disabled:opacity-50">
                                {loading ? 'Signing up...' : 'Create Account'}
                            </button>
                            <div className="text-center mt-4">
                                <p className="text-sm text-neutral-500">Already have an account? <span className="text-primary hover:underline cursor-pointer" onClick={() => navigate('/login')}>Login</span></p>
                            </div>
                        </form>
                    </div>
                </div>
            </main >
        </div >
    );
}

export default Register;
