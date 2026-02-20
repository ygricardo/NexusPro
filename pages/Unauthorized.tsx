import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 dark:bg-surface-dark text-neutral-900 dark:text-white">
            <h1 className="text-4xl font-bold mb-4 text-red-500">Access Denied</h1>
            <p className="mb-8 text-lg">You do not have permission to view this page.</p>
            <Link to="/dashboard" className="text-primary hover:underline">
                Return to Dashboard
            </Link>
        </div>
    );
};

export default Unauthorized;
