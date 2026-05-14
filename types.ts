export interface NavItem {
    to: string;
    icon: string;
    label: string;
}

export type UserRole = 'admin' | 'user';
// Plan slugs are dynamic (managed in the public.plans table by admins).
// 'no_plan' is the sentinel for users without an active subscription.
export type UserPlan = string;

export interface Plan {
    id: string;
    slug: string;
    name: string;
    description?: string | null;
    price_cents: number;
    currency: string;
    interval: 'month' | 'year';
    features: string[];
    modules: string[];
    color?: string | null;
    is_active: boolean;
    display_order: number;
    created_at?: string;
    updated_at?: string;
}

/// <reference types="vite/client" />

export interface User {
    name: string;
    role: UserRole;
    plan: UserPlan;
    id: string;
    status: 'Active' | 'Offline' | 'Busy';
    avatar: string;
    email: string;
    access?: string[];
    created_at?: string;
}

export interface Client {
    id: string;
    initials: string;
    name: string;
    nextSession: string;
    progress: number;
    status: 'Active' | 'Inactive';
}

export interface BehaviorData {
    name: string;
    count: number;
    type: 'Maladaptive' | 'Skill Acquisition';
    color: string;
}