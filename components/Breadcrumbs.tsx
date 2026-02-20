import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link, useSearchParams, matchPath } from 'react-router-dom';
import { authApi } from '../lib/api';

const Breadcrumbs = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [clientName, setClientName] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Determine Client ID from URL params or Path
    const clientPathMatch = matchPath('/clients/:id/*', location.pathname);
    const clientId = clientPathMatch?.params.id || searchParams.get('client_id');

    useEffect(() => {
        const fetchClientName = async () => {
            if (clientId) {
                setLoading(true);
                try {
                    const response = await authApi.getClient(clientId);
                    if (response.ok) {
                        const data = await response.json();
                        setClientName(`${data.first_name} ${data.last_name}`);
                    }
                } catch (error) {
                    console.error("Failed to fetch client for breadcrumbs", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setClientName(null);
            }
        };

        fetchClientName();
    }, [clientId]);

    // Generate Crumbs based on path
    const getCrumbs = () => {
        const crumbs = [];

        // Base Dashboard
        // crumbs.push({ label: 'Dashboard', path: '/' }); 
        // User asked for specific style: "CLIENT Brandon Sosa > Note Generator"
        // Let's try to be smart.

        const path = location.pathname;

        if (path.includes('/clients')) {
            crumbs.push({ label: 'Clients', path: '/caseload' });
            if (clientName) {
                crumbs.push({ label: clientName, path: `/clients/${clientId}` });
            }
        } else if (path === '/session-note') {
            if (clientName) {
                crumbs.push({ label: 'Clients', path: '/caseload' });
                crumbs.push({ label: clientName, path: `/clients/${clientId}` });
            }
            crumbs.push({ label: 'Note Generator', path: path + location.search });
        } else if (path === '/rbt-generator') {
            if (clientName) {
                crumbs.push({ label: 'Clients', path: '/caseload' });
                crumbs.push({ label: clientName, path: `/clients/${clientId}` });
            }
            crumbs.push({ label: 'Daily Data', path: path + location.search });
        } else if (path === '/bcba-generator') {
            if (clientName) {
                crumbs.push({ label: 'Clients', path: '/caseload' });
                crumbs.push({ label: clientName, path: `/clients/${clientId}` });
            }
            crumbs.push({ label: 'Weekly Analysis', path: path + location.search });
        } else {
            // Default Fallback
            // Capitalize simple paths
            const name = path.replace('/', '').replace('-', ' ');
            if (name) {
                crumbs.push({ label: name.charAt(0).toUpperCase() + name.slice(1), path });
            } else {
                crumbs.push({ label: 'Dashboard', path: '/' });
            }
        }

        return crumbs;
    };

    const crumbs = getCrumbs();

    // Handle Back
    const handleBack = () => {
        navigate(-1);
    };

    return (
        <div className="flex items-center gap-3 text-sm font-medium">
            {/* Back Button */}
            <button
                onClick={handleBack}
                className="flex items-center justify-center p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-all group"
                title="Go Back"
            >
                <span className="material-symbols-outlined text-lg group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
            </button>

            {/* Separator */}
            <div className="h-4 w-px bg-white/10"></div>

            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2">
                {crumbs.map((crumb, index) => {
                    const isLast = index === crumbs.length - 1;
                    return (
                        <React.Fragment key={index}>
                            {index > 0 && (
                                <span className="material-symbols-outlined text-neutral-600 text-sm">chevron_right</span>
                            )}
                            {isLast ? (
                                <span className="text-white font-bold">{crumb.label}</span>
                            ) : (
                                <Link
                                    to={crumb.path}
                                    className="text-neutral-400 hover:text-cyan-400 transition-colors"
                                >
                                    {crumb.label}
                                </Link>
                            )}
                        </React.Fragment>
                    );
                })}
            </nav>
        </div>
    );
};

export default Breadcrumbs;
