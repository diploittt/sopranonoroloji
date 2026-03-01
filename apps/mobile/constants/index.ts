// Constants for the mobile app
export const API_BASE_URL = __DEV__
    ? 'http://10.0.2.2:3002'   // Android emulator → host machine (port 3002)
    : 'https://api.sopranochat.com';

export const SOCKET_URL = API_BASE_URL;

export const LIVEKIT_URL = 'wss://soprano-chat-98fpupmw.livekit.cloud';

export const COLORS = {
    // Dark theme — web ile aynı
    bg: '#0b0d14',
    bgSecondary: '#13151c',
    bgTertiary: '#1a1c25',
    surface: '#1e2030',
    surfaceHover: '#262838',
    border: 'rgba(255,255,255,0.08)',
    borderLight: 'rgba(255,255,255,0.12)',

    // Brand
    primary: '#6366F1',
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    accent: '#A855F7',
    accentLight: '#C084FC',

    // Text
    text: '#E2E8F0',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',

    // Status
    online: '#22C55E',
    away: '#EAB308',
    busy: '#EF4444',
    error: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    info: '#3B82F6',

    // Misc
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
    mobileBadge: '#FF6B35',

    // Glassmorphism
    glass: 'rgba(255,255,255,0.03)',
    glassBorder: 'rgba(255,255,255,0.06)',
};

// Rol renkleri — web ile aynı
export const ROLE_COLORS: Record<string, string> = {
    godmaster: '#FF0000',
    owner: '#EF4444',
    superadmin: '#F97316',
    admin: '#EAB308',
    moderator: '#22C55E',
    operator: '#3B82F6',
    vip: '#A855F7',
    member: '#6366F1',
    guest: '#64748B',
};

export const ROLE_LABELS: Record<string, string> = {
    godmaster: 'GodMaster',
    owner: 'Patron',
    superadmin: 'Süper Admin',
    admin: 'Admin',
    moderator: 'Moderatör',
    operator: 'Operatör',
    vip: 'VIP',
    member: 'Üye',
    guest: 'Misafir',
};

export const FONTS = {
    regular: 'System',
    medium: 'System',
    bold: 'System',
};

export const SIZES = {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    title: 28,
    avatar: 40,
    avatarLarge: 56,
    avatarSmall: 32,
    borderRadius: 12,
    borderRadiusLg: 16,
    borderRadiusSm: 8,
    padding: 16,
    paddingSm: 8,
};
