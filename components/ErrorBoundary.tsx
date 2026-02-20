import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white h-screen w-full flex flex-col items-center justify-center">
                    <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
                    <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 max-w-2xl w-full overflow-auto">
                        <h2 className="font-bold text-primary mb-2">{this.state.error?.toString()}</h2>
                        <details className="whitespace-pre-wrap font-mono text-xs text-neutral-500 dark:text-neutral-400">
                            {this.state.errorInfo?.componentStack}
                        </details>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-3 bg-primary text-white rounded-xl hover:bg-red-700 transition shadow-lg shadow-primary/20 font-bold"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
