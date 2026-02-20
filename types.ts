export interface NavItem {
    to: string;
    icon: string;
    label: string;
}

export type UserRole = 'admin' | 'user';
export type UserPlan = 'basic' | 'advanced' | 'elite' | 'no_plan';

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