// SopranoChat Mobile Design System — Web ile birebir eşleşen
export const COLORS = {
  // ═══ Arka Plan Gradyanları (web'deki lavanta-mavi) ═══
  gradientStart: '#cbd5e1',   // Açık lavanta
  gradientMid: '#b4bfd0',     // Orta ton
  gradientEnd: '#94a3b8',     // Koyu lavanta

  // ═══ Panel Arka Planları (glassmorphic) ═══
  bg: '#070b14',              // Panel ana arka plan
  bgLight: '#0f172a',
  bgCard: '#161b2e',
  bgPanel: 'rgba(7, 11, 20, 0.88)',     // Ana glassmorphic panel
  bgPanelLight: 'rgba(15, 23, 42, 0.75)', // Alt paneller
  bgInput: 'rgba(0, 0, 0, 0.35)',       // Input alanları
  bgOverlay: 'rgba(0, 0, 0, 0.5)',      // Modal overlay

  // ═══ Vurgu Renkleri ═══
  cyan: '#38bdf8',            // Ana accent (başlıklar, seçili)
  cyanDark: '#0284c7',
  cyanGlow: 'rgba(56, 189, 248, 0.3)',
  indigo: '#7b9fef',          // Butonlar, ikonlar
  indigoGlow: 'rgba(123, 159, 239, 0.3)',
  emerald: '#10b981',         // Misafir giriş, mikrofon
  emeraldDark: '#059669',

  // ═══ Statü Renkleri ═══
  gold: '#fbbf24',            // Premium, VIP, owner
  red: '#ef4444',             // Üye giriş, canlı yayın
  redDark: '#dc2626',
  green: '#34d399',           // Online durumu
  purple: '#a78bfa',          // Admin
  pink: '#f472b6',            // Kadın cinsiyet
  orange: '#f59e0b',          // Uyarı

  // ═══ Metin ═══
  white: '#ffffff',
  textPrimary: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  // ═══ Kenarlar ═══
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.15)',
  borderCyan: 'rgba(56, 189, 248, 0.4)',
  borderGlow: 'rgba(56, 189, 248, 0.15)',

  // ═══ Mesaj Balonları ═══
  msgOwn: 'rgba(123, 159, 239, 0.15)',    // Kendi mesajım
  msgOwnBorder: 'rgba(123, 159, 239, 0.3)',
  msgOther: 'rgba(7, 11, 20, 0.6)',       // Diğer mesajlar
  msgOtherBorder: 'rgba(255, 255, 255, 0.06)',
  msgSystem: 'rgba(56, 189, 248, 0.08)',  // Sistem mesajları
};

export const SHADOWS = {
  panel: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  glow: {
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const API_URL = 'https://api.sopranochat.com';
export const WS_URL = 'wss://api.sopranochat.com';
export const LIVEKIT_URL = 'wss://video.sopranochat.com';
export const DEFAULT_TENANT_ID = 'cmmnh7fk90000v4bj0fizexrr';

export const AVATARS = [
  '/avatars/male_1.png', '/avatars/male_2.png', '/avatars/male_3.png', '/avatars/male_4.png',
  '/avatars/female_1.png', '/avatars/female_2.png', '/avatars/female_3.png', '/avatars/female_4.png',
  '/avatars/neutral_1.png', '/avatars/neutral_2.png', '/avatars/neutral_3.png', '/avatars/neutral_4.png',
];

export const getAvatarUrl = (path: string) => {
  if (!path) return 'https://sopranochat.com/avatars/male_1.png';
  if (path.startsWith('http')) return path;
  return `https://sopranochat.com${path}`;
};

export const GENDERS = [
  { key: 'Erkek', label: '♂ ERKEK', color: COLORS.cyan, icon: '♂' },
  { key: 'Kadın', label: '♀ KADIN', color: COLORS.pink, icon: '♀' },
  { key: 'Belirsiz', label: '⭐ BELİRTME', color: COLORS.textSecondary, icon: '⭐' },
] as const;

export const ROLE_CONFIG: Record<string, { icon: string; color: string; label: string; level: number }> = {
  godmaster: { icon: '🔱', color: '#d946ef', label: 'GodMaster', level: 10 },
  owner: { icon: '👑', color: '#fbbf24', label: 'Site Sahibi', level: 9 },
  superadmin: { icon: '⚡', color: '#7b9fef', label: 'Süper Admin', level: 8 },
  admin: { icon: '🛡️', color: '#60a5fa', label: 'Yönetici', level: 7 },
  moderator: { icon: '🔧', color: '#34d399', label: 'Moderatör', level: 6 },
  operator: { icon: '🎯', color: '#22d3ee', label: 'Operatör', level: 5 },
  vip: { icon: '💎', color: '#fde047', label: 'VIP', level: 4 },
  member: { icon: '✦', color: '#ffffff', label: 'Üye', level: 3 },
  guest: { icon: '👤', color: '#94a3b8', label: 'Misafir', level: 1 },
};

// Radyo Kanalları
export const RADIO_CHANNELS = [
  { id: 'powerfm', name: 'Power FM', genre: 'POP / DANCE', url: 'https://listen.powerfm.com.tr/powerfm/128/icecast.audio' },
  { id: 'slowturk', name: 'SlowTürk', genre: 'SLOW', url: 'https://listen.slowturk.com/slowturk/128/icecast.audio' },
  { id: 'rockfm', name: 'Rock FM', genre: 'ROCK', url: 'https://stream.rockfm.com.tr/rockfm/128/icecast.audio' },
];
