import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
    /** Optional label for the module being protected, e.g. "Note Generator" */
    moduleName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary — NexusPro
 *
 * Catches rendering errors inside any wrapped sub-tree and displays a
 * recovery UI that lets the user reset the module WITHOUT a full page
 * reload, preserving the session and navigation state entirely.
 *
 * Usage:
 *   <ErrorBoundary moduleName="Note Generator">
 *     <SessionNote />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Persist the componentStack for dev debugging (never exposed to the user)
        this.setState({ errorInfo });

        // In production you could POST error details to /api/logs here
        console.error('[ErrorBoundary] Uncaught error in:', this.props.moduleName ?? 'Unknown module', error, errorInfo);
    }

    /** Resets internal state so the child tree is re-mounted cleanly */
    private handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    public render() {
        if (this.state.hasError) {
            const module = this.props.moduleName ?? 'este módulo';

            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] w-full p-6">
                    <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-red-100 dark:border-red-900/30 p-8 max-w-md w-full text-center">
                        {/* Icon */}
                        <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-primary text-4xl">error</span>
                        </div>

                        {/* Title */}
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                            Error inesperado
                        </h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
                            Ocurrió un problema al cargar <strong>{module}</strong>. Tu sesión y datos están intactos.
                        </p>

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={this.handleReset}
                                className="w-full px-6 py-3 bg-secondary text-neutral-900 dark:text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-secondary/20 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">refresh</span>
                                Reintentar módulo
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="w-full px-6 py-3 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">home</span>
                                Ir al Dashboard
                            </button>
                        </div>

                        {/* Dev-only details (hidden in production) */}
                        {process.env.NODE_ENV !== 'production' && this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="text-xs text-neutral-400 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300">
                                    Detalle técnico (solo visible en desarrollo)
                                </summary>
                                <pre className="mt-2 text-xs font-mono text-red-500 bg-red-50 dark:bg-red-900/10 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap">
                                    {this.state.error.toString()}
                                    {'\n'}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
