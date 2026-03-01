export type Tenant = {
    id: string;
    name: string; // "Ahmet Demir"
    displayName?: string; // "Murat'ın Mekanı" — müşterinin platformuna verdiği isim
    domain: string; // "damar.fm"
    slug: string; // "damar-fm"
    accessCode?: string; // Müşteri giriş linki için karmaşık token
    phone?: string; // Müşteri telefon numarası
    plan: "FREE" | "PRO" | "ENTERPRISE";
    status: "ACTIVE" | "SUSPENDED" | "PASSIVE"; // Added PASSIVE to match UI mock
    createdAt: string;
    expiresAt: string;
    roomLimit: number;
    userLimitPerRoom?: number;
    userImg?: string; // Optional for UI avatar
    packageType?: 'CAMERA' | 'NO_CAMERA'; // Added packageType
    billingPeriod?: 'MONTHLY' | 'YEARLY'; // Aylık veya Yıllık
    isMeetingRoom?: boolean; // Added isMeetingRoom
    // Extended fields based on backend schema
    theme?: string;
    watermarkEnabled?: boolean;
    logoUrl?: string;
    users?: { displayName: string; email: string; id: string; }[];
};

export type TenantRoom = {
    id: string;
    tenantId: string;
    name: string;
    slug: string;
    maxUsers: number;
    videoEnabled: boolean;
};

export interface AdminActivity {
    id: string;
    type: string;
    description: string;
    timestamp: string;
}

export interface AdminStats {
    totalTenants: number;
    activeRooms: number;
    totalUsers: number;
    systemHealth: string;
    revenue: string;
    serverLoad: string;
}

export interface AdminState {
    tenants: Tenant[];
    rooms: TenantRoom[];
    stats: AdminStats;
    recentActivities: AdminActivity[];
}
