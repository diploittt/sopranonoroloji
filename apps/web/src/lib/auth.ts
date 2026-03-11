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
const SESSION_TIMESTAMP_KEY = 'soprano_session_ts';
/** Session timeout: 24 hours in milliseconds */
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000;

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

/**
 * Tüm soprano_ auth anahtarlarını temizler.
 * Güvenlik: Çıkış yapıldığında veya oturum süresi dolduğunda çağrılır.
 * Not: Dil tercihi (soprano_language) ve tema (soprano_landing_dark) gibi
 * kullanıcı deneyimi ayarları korunur.
 */
export const clearAllSopranoAuth = () => {
    if (typeof window === 'undefined') return;
    const authKeys = [
        'soprano_auth_token', 'soprano_auth_user',
        'soprano_tenant_token', 'soprano_tenant_user',
        'soprano_admin_token',
        'soprano_session_ts',
        'soprano_user_status', 'soprano_user',
        'soprano_godmaster_disguise_name', 'soprano_godmaster_icon',
        'soprano_user_theme', 'soprano_entry_url',
    ];
    authKeys.forEach(k => localStorage.removeItem(k));
    // Also clear any dynamic soprano_auth_token_* / soprano_auth_user_* keys
    Object.keys(localStorage).forEach(key => {
        if ((key.startsWith('soprano_auth_token_') || key.startsWith('soprano_auth_user_')) && key !== 'soprano_auth_token' && key !== 'soprano_auth_user') {
            localStorage.removeItem(key);
        }
    });
    window.dispatchEvent(new Event('auth-change'));
};

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
        clearAllSopranoAuth();
        return null;
    }

    // Session timeout kontrolü — 2 saat geçmişse otomatik çıkış
    const sessionTs = localStorage.getItem(SESSION_TIMESTAMP_KEY);
    if (sessionTs) {
        const elapsed = Date.now() - parseInt(sessionTs, 10);
        if (elapsed > SESSION_TIMEOUT_MS) {
            console.warn(`[Auth] Session expired (${Math.round(elapsed / 60000)} min). Auto-clearing.`);
            clearAllSopranoAuth();
            return null;
        }
    } else {
        // Eski oturum — timestamp yoksa yeni timestamp oluştur (oturumu koru)
        localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
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
    // Oturum zaman damgasını güncelle
    localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
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
