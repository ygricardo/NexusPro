const API_URL = '/api';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('nexus_token');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    } as any;

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        // Token expired or invalid - could trigger logout here
        // localStorage.removeItem('nexus_token');
        // window.location.href = '/login';
    }

    return response;
};

export const authApi = {
    login: (credentials: any) => apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
    }),
    register: (userData: any) => apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
    }),
    getProfile: () => apiFetch('/auth/profile', {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    }),
    createCheckoutSession: (planId: string, interval: 'month' | 'year') => apiFetch('/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ planId, interval }),
    }),
    updateUser: (userId: string, data: any) => apiFetch(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteUser: (userId: string) => apiFetch(`/admin/users/${userId}`, {
        method: 'DELETE'
    }),
    verifySession: (sessionId: string) => apiFetch('/stripe/verify-session', {
        method: 'POST',
        body: JSON.stringify({ sessionId })
    }),
    cancelSubscription: () => apiFetch('/stripe/cancel-subscription', {
        method: 'POST'
    }),
    resumeSubscription: () => apiFetch('/stripe/resume-subscription', {
        method: 'POST'
    }),
    getSubscriptionDetails: () => apiFetch('/stripe/subscription-details'),
    createPortalSession: () => apiFetch('/stripe/create-portal-session', {
        method: 'POST'
    }),
    updateSubscription: (planId: string) => apiFetch('/stripe/update-subscription', {
        method: 'PUT',
        body: JSON.stringify({ planId })
    }),
    // History API
    saveGenerationHistory: (data: { module_type: string, input_data: any, output_data: any }) => apiFetch('/history', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    fetchGenerationHistory: (type: string) => apiFetch(`/history/${type}`),
    deleteGenerationHistory: (id: string) => apiFetch(`/history/${id}`, {
        method: 'DELETE'
    }),
    saveNote: (data: any) => apiFetch('/notes', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    getNotesByUser: () => apiFetch('/notes'),
    // Clients Caseload API
    getClients: () => apiFetch('/clients'),
    createClient: (data: any) => apiFetch('/clients', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateClient: (id: string, data: any) => apiFetch(`/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteClient: (id: string) => apiFetch(`/clients/${id}`, {
        method: 'DELETE'
    }),
    saveDailyRecord: (data: any) => apiFetch('/clients/daily', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    saveWeeklyRecord: (data: any) => apiFetch('/clients/weekly', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    getClient: (id: string) => apiFetch(`/clients/${id}`),
    getClientHistory: (id: string) => apiFetch(`/clients/${id}/history`),

    // Get Notes by Client
    getNotesByClient: (clientId: string) => apiFetch(`/notes/client/${clientId}`),
    deleteNote: (id: string) => apiFetch(`/notes/${id}`, {
        method: 'DELETE'
    })
};
