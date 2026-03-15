import { create } from "zustand";
import { AdminState, Tenant, TenantRoom, AdminStats, AdminActivity } from "./types";
import { API_URL } from '@/lib/api';

// Toast Types
export type ToastType = 'success' | 'error' | 'info';
export interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

export interface ProvisioningDTO {
    name: string;
    phone: string;
    email: string;
    domain?: string;
    hostingType?: 'sopranochat' | 'own_domain';
    plan: 'FREE' | 'PRO' | 'ENTERPRISE';
    roomCount: number;
    cameraEnabled: boolean;
    userLimit: number;
}

interface AdminStore extends AdminState {
    // UI State
    toasts: Toast[];
    maintenanceMode: boolean;
    globalMute: boolean;

    setStats: (stats: AdminStats) => void;
    loadInitialData: () => Promise<void>;

    // Actions
    addToast: (message: string, type: ToastType) => void;
    removeToast: (id: string) => void;
    toggleMaintenance: () => void;
    toggleGlobalMute: () => void;

    addTenant: (tenant: Omit<Tenant, "id" | "createdAt" | "expiresAt">) => Promise<void>;
    updateTenant: (id: string, updates: Partial<Tenant>) => Promise<void>;
    deleteTenant: (id: string) => Promise<void>;

    addRoom: (room: Omit<TenantRoom, "id">) => Promise<void>;
    deleteRoom: (id: string) => Promise<void>;

    getRoomsByTenant: (tenantId: string) => TenantRoom[];

    // Provisioning
    provisionCustomer: (data: ProvisioningDTO) => Promise<any>;
}

export const useAdminStore = create<AdminStore>((set, get) => ({
    tenants: [],
    rooms: [],
    stats: {
        totalTenants: 0,
        activeRooms: 0,
        totalUsers: 0,
        systemHealth: "Good",
        revenue: "₺ 0",
        serverLoad: "0%",
    },
    recentActivities: [],

    // UI Initial State
    toasts: [],
    maintenanceMode: false,
    globalMute: false,

    // UI Actions
    addToast: (message, type) => {
        const id = Math.random().toString(36).substring(7);
        set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
        setTimeout(() => get().removeToast(id), 3000);
    },
    removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
    // Provisioning
    provisionCustomer: async (data: ProvisioningDTO) => {
        try {
            const token = sessionStorage.getItem('soprano_admin_token') || sessionStorage.getItem('soprano_auth_token');

            if (!token) {
                throw new Error('Token bulunamadı. Lütfen /riconun-odasi sayfasından giriş yapın.');
            }

            const response = await fetch(`${API_URL}/admin/customers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data),
            });

            console.log('[DEBUG] Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.log('[DEBUG] Error response:', errorText);
                throw new Error(errorText);
            }

            const result = await response.json();

            // Refresh full tenant list from backend to ensure consistency
            await get().loadInitialData();

            return result;
        } catch (error) {
            console.error('Provisioning error:', error);
            throw error;
        }
    },
    toggleMaintenance: () => {
        set((state) => {
            const newState = !state.maintenanceMode;
            get().addToast(`Maintenance Mode ${newState ? 'Enabled' : 'Disabled'}`, newState ? 'error' : 'success');
            return { maintenanceMode: newState };
        });
    },
    toggleGlobalMute: () => {
        set((state) => {
            const newState = !state.globalMute;
            get().addToast(`Global Mute ${newState ? 'Enabled' : 'Disabled'}`, newState ? 'error' : 'success');
            return { globalMute: newState };
        });
    },

    setStats: (stats) => set({ stats }),

    loadInitialData: async () => {
        try {
            const token = sessionStorage.getItem('soprano_admin_token');
            if (!token) {
                window.location.href = '/riconun-odasi';
                return;
            }
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            console.log('[loadInitialData] Fetching customers from:', `${API_URL}/admin/customers`);
            console.log('[loadInitialData] Token (first 20 chars):', token?.substring(0, 20));
            const tenantsRes = await fetch(`${API_URL}/admin/customers`, { headers });
            console.log('[loadInitialData] Response status:', tenantsRes.status);
            if (tenantsRes.status === 401 || tenantsRes.status === 403) {
                sessionStorage.removeItem('soprano_admin_token');
                window.location.href = '/riconun-odasi';
                return;
            }
            if (!tenantsRes.ok) {
                const errorBody = await tenantsRes.text().catch(() => '');
                console.error('[loadInitialData] Error response body:', errorBody);
                throw new Error(`Failed to fetch customers (HTTP ${tenantsRes.status}): ${errorBody}`);
            }
            const tenants: Tenant[] = await tenantsRes.json();

            // 2. Fetch Rooms (Optional for initial load if we want them global)
            // For now, let's just focus on tenants as requested.
            // rooms are fetched per tenant in DomainTable usually expansion

            set({
                tenants,
                stats: {
                    totalTenants: tenants.length,
                    activeRooms: 0,
                    totalUsers: 0,
                    systemHealth: "Good",
                    revenue: "₺ 45.2K",
                    serverLoad: "12%",
                },
            });
        } catch (error) {
            console.error("Error loading initial data:", error);
        }
    },

    addTenant: async (tenantData) => {
        try {
            const token = sessionStorage.getItem('soprano_admin_token');
            const res = await fetch(`${API_URL}/admin/customers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...tenantData,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                }),
            });
            if (!res.ok) throw new Error("Failed to create tenant");
            const newTenant = await res.json();
            set((state) => ({ tenants: [...state.tenants, newTenant] }));
        } catch (error) {
            console.error("Error adding tenant:", error);
        }
    },

    updateTenant: async (id, updates) => {
        try {
            const token = sessionStorage.getItem('soprano_admin_token');
            const res = await fetch(`${API_URL}/admin/customers/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(updates),
            });

            if (!res.ok) {
                const errorBody = await res.text().catch(() => '');
                console.error(`[updateTenant] HTTP ${res.status}: ${errorBody}`);
                throw new Error(`Failed to update tenant (${res.status})`);
            }

            // Backend returns updated tenant
            const updatedTenant = await res.json();

            set((state) => ({
                tenants: state.tenants.map((t) => (t.id === id ? updatedTenant : t)),
            }));
        } catch (error) {
            console.error("Error updating tenant:", error);
            throw error;
        }
    },

    deleteTenant: async (id) => {
        try {
            const token = sessionStorage.getItem('soprano_admin_token');
            await fetch(`${API_URL}/admin/customers/${id}`, {
                method: "DELETE",
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            set((state) => ({
                tenants: state.tenants.filter((t) => t.id !== id),
                rooms: state.rooms.filter((r) => r.tenantId !== id),
            }));
        } catch (error) {
            console.error("Error deleting tenant:", error);
        }
    },

    addRoom: async (roomData) => {
        try {
            const tenant = get().tenants.find((t) => t.id === roomData.tenantId);
            if (!tenant) throw new Error("Tenant not found");

            const res = await fetch(`${API_URL}/rooms`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tenant: tenant.domain, // API expects tenant slug/domain
                    name: roomData.name,
                    slug: roomData.slug,
                    capacity: roomData.maxUsers,
                }),
            });
            if (!res.ok) throw new Error("Failed to create room");
            const newRoom = await res.json();
            set((state) => ({ rooms: [...state.rooms, newRoom] }));
        } catch (error) {
            console.error("Error adding room:", error);
        }
    },

    deleteRoom: async (id) => {
        try {
            const res = await fetch(`${API_URL}/rooms/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete room");
            set((state) => ({
                rooms: state.rooms.filter((r) => r.id !== id),
            }));
        } catch (error) {
            console.error("Error deleting room:", error);
        }
    },

    getRoomsByTenant: (tenantId) => {
        return get().rooms.filter((r) => r.tenantId === tenantId);
    },
}));
