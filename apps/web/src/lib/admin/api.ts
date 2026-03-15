import { API_URL } from '@/lib/api';

// ─── Helper ─────────────────────────────────────────────
function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    // URL-aware: tenant pages use soprano_tenant_token, system pages use soprano_auth_token
    // Chat room admin panel uses soprano_admin_token
    const isTenantPage = window.location.pathname.startsWith('/t/');
    if (isTenantPage) {
        return sessionStorage.getItem('soprano_tenant_token') || sessionStorage.getItem('soprano_admin_token') || sessionStorage.getItem('soprano_auth_token');
    }
    return sessionStorage.getItem('soprano_auth_token') || sessionStorage.getItem('soprano_admin_token') || sessionStorage.getItem('soprano_tenant_token');
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    // console.log(`[AdminAPI] ${path}`, token ? 'Token OK' : 'NO TOKEN');
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || `API Error ${res.status}`);
    }

    // Handle 204 No Content
    if (res.status === 204) return {} as T;
    return res.json();
}

// ─── Admin API ──────────────────────────────────────────
export const adminApi = {
    // Users
    getUsers(filters?: { search?: string; role?: string; page?: number; limit?: number }) {
        const params = new URLSearchParams();
        if (filters?.search) params.set('search', filters.search);
        if (filters?.role) params.set('role', filters.role);
        if (filters?.page) params.set('page', String(filters.page));
        if (filters?.limit) params.set('limit', String(filters.limit));
        return request(`/admin/users?${params}`);
    },

    getUserDetail(userId: string) {
        return request(`/admin/users/${userId}`);
    },

    updateUser(userId: string, data: Record<string, any>) {
        return request(`/admin/users/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    deleteUser(userId: string) {
        return request(`/admin/users/${userId}`, { method: 'DELETE' });
    },

    // Rooms
    getRooms() {
        return request('/admin/rooms');
    },

    createRoom(data: { name: string; slug?: string; password?: string; announcement?: string; maxParticipants?: number }) {
        return request('/admin/rooms', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    updateRoom(roomId: string, data: Record<string, any>) {
        return request(`/admin/rooms/${roomId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    deleteRoom(roomId: string) {
        return request(`/admin/rooms/${roomId}`, { method: 'DELETE' });
    },

    closeRoom(roomId: string) {
        return request(`/admin/rooms/${roomId}/close`, { method: 'POST' });
    },

    // Bans
    getBans(filters?: { type?: string; active?: boolean }) {
        const params = new URLSearchParams();
        if (filters?.type) params.set('type', filters.type);
        if (filters?.active !== undefined) params.set('active', String(filters.active));
        return request(`/admin/bans?${params}`);
    },

    createBan(data: { userId: string; type?: string; duration?: string; reason?: string; ip?: string }) {
        return request('/admin/bans', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    removeBan(banId: string) {
        return request(`/admin/bans/${banId}`, { method: 'DELETE' });
    },

    // IP Bans (backend route: /admin/ipbans)
    getIpBans() {
        return request('/admin/ipbans');
    },

    createIpBan(data: { ip: string; reason?: string }) {
        return request('/admin/ipbans', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    removeIpBan(banId: string) {
        return request(`/admin/ipbans/${banId}`, { method: 'DELETE' });
    },

    // Audit Logs
    getAuditLogs(filters?: { event?: string; userId?: string; page?: number; limit?: number }) {
        const params = new URLSearchParams();
        if (filters?.event) params.set('event', filters.event);
        if (filters?.userId) params.set('userId', filters.userId);
        if (filters?.page) params.set('page', String(filters.page));
        if (filters?.limit) params.set('limit', String(filters.limit));
        // Oda sistemi loglarını göster, /admin-login panel eylemlerini hariç tut
        params.set('excludeSystemEvents', 'true');
        return request(`/admin/audit-logs?${params}`);
    },

    // Word Filters (backend route: /admin/words)
    getWordFilters() {
        return request('/admin/words');
    },

    createWordFilter(data: { badWord: string; replacement?: string }) {
        return request('/admin/words', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    removeWordFilter(filterId: string) {
        return request(`/admin/words/${filterId}`, { method: 'DELETE' });
    },

    // Settings
    getSettings() {
        return request('/admin/settings');
    },

    updateSettings(data: Record<string, any>) {
        return request('/admin/settings', {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    // Members
    getMembers(filters?: { q?: string; page?: number; limit?: number }) {
        const params = new URLSearchParams();
        if (filters?.q) params.set('q', filters.q);
        if (filters?.page) params.set('page', String(filters.page));
        if (filters?.limit) params.set('limit', String(filters.limit));
        return request(`/admin/members?${params}`);
    },

    createMember(data: any) {
        return request('/admin/members', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Contact Messages
    getContactMessages(filters?: { unreadOnly?: boolean; page?: number; limit?: number }) {
        const params = new URLSearchParams();
        if (filters?.unreadOnly) params.set('unreadOnly', 'true');
        if (filters?.page) params.set('page', String(filters.page));
        if (filters?.limit) params.set('limit', String(filters.limit));
        return request(`/admin/contact-messages?${params}`);
    },

    markMessageRead(id: string) {
        return request(`/admin/contact-messages/${id}/read`, { method: 'PATCH' });
    },

    deleteContactMessage(id: string) {
        return request(`/admin/contact-messages/${id}`, { method: 'DELETE' });
    },
};
