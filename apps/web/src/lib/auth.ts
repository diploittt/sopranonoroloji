import { generateGenderAvatar } from './avatar';

export interface AuthUser {
    userId: string;
    username: string;
    avatar: string;
    isMember: boolean;
    role: 'guest' | 'member' | 'vip' | 'operator' | 'moderator' | 'admin' | 'superadmin' | 'owner';
    gender?: string;
    email?: string;
    displayName?: string;
}

const SYSTEM_USER_KEY = 'soprano_auth_user';
const TENANT_USER_KEY = 'soprano_tenant_user';

/** URL-aware key selection: tenant pages use soprano_tenant_user, system pages use soprano_auth_user */
function getAuthKey(): string {
    if (typeof window === 'undefined') return SYSTEM_USER_KEY;
    return window.location.pathname.startsWith('/t/') ? TENANT_USER_KEY : SYSTEM_USER_KEY;
}

/** URL-aware token check */
function getActiveToken(): string | null {
    if (typeof window === 'undefined') return null;
    const isTenant = window.location.pathname.startsWith('/t/');
    if (isTenant) {
        return localStorage.getItem('soprano_tenant_token') || localStorage.getItem('soprano_auth_token');
    }
    return localStorage.getItem('soprano_auth_token') || localStorage.getItem('soprano_tenant_token');
}

export const getAuthUser = (): AuthUser | null => {
    if (typeof window === 'undefined') return null;

    const key = getAuthKey();
    const storedUser = localStorage.getItem(key);
    const storedToken = getActiveToken();

    if (!storedUser || !storedToken) {
        // If user exists but NO token at all, clear to avoid inconsistent state
        if (storedUser && !storedToken) {
            console.warn('[Auth] Inconsistent auth state detected (missing token). Clearing session.');
            localStorage.removeItem(key);
        }
        return null;
    }

    // Auto-clear bloated tokens (> 4KB = old tokens with permissions embedded)
    if (storedToken.length > 4096) {
        console.warn(`[Auth] Token too large (${storedToken.length} chars). Clearing to allow fresh login.`);
        localStorage.removeItem(key);
        localStorage.removeItem('soprano_auth_token');
        return null;
    }

    try {
        return JSON.parse(storedUser);
    } catch (e) {
        return null;
    }
};

export const setAuthUser = (user: AuthUser) => {
    if (typeof window === 'undefined') return;
    const key = getAuthKey();
    localStorage.setItem(key, JSON.stringify(user));
    // Dispatch a custom event so components can react immediately
    window.dispatchEvent(new Event('auth-change'));
};

export const removeAuthUser = () => {
    if (typeof window === 'undefined') return;
    const key = getAuthKey();
    localStorage.removeItem(key);
    window.dispatchEvent(new Event('auth-change'));
};

export const ensureAuthUser = (params?: { username?: string; avatar?: string; gender?: string }) => {
    if (typeof window === 'undefined') return null; // SSR guard

    let user = getAuthUser();

    if (!user) {
        // Create new guest
        const id = crypto.randomUUID ? crypto.randomUUID() : `guest_${Date.now()}`;
        user = {
            userId: id,
            username: params?.username || `Misafir_${id.slice(0, 4)}`,
            avatar: params?.avatar || generateGenderAvatar(params?.username || id, params?.gender),
            isMember: false,
            role: 'guest',
            gender: params?.gender || 'Unspecified'
        };
        setAuthUser(user);
    }

    // Return object compatible with hook requirements (mapping userId -> id, username -> name)
    return {
        ...user,
        id: user.userId,
        name: user.username,
        isGuest: user.role === 'guest'
    };
};
