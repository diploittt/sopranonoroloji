import { create } from 'zustand';

export interface AuthUser {
    userId: string;
    displayName: string;
    username: string;
    role: string;
    avatar?: string;
    email?: string;
    tenantId: string;
    gender?: string;
    isGuest: boolean;
    token: string;
}

interface AuthState {
    user: AuthUser | null;
    isLoading: boolean;
    setUser: (user: AuthUser | null) => void;
    setLoading: (loading: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLoading: true,
    setUser: (user) => set({ user, isLoading: false }),
    setLoading: (isLoading) => set({ isLoading }),
    logout: () => set({ user: null, isLoading: false }),
}));
