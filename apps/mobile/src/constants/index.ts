// SopranoChat Design Constants
export const COLORS = {
  // Primary palette
  bg: '#0a0f1d',
  bgLight: '#0f172a',
  bgCard: '#161b2e',
  bgPanel: 'rgba(15, 23, 42, 0.85)',
  
  // Accent
  cyan: '#38bdf8',
  cyanDark: '#0284c7',
  cyanGlow: 'rgba(56, 189, 248, 0.3)',
  
  // Status colors
  gold: '#fbbf24',
  red: '#ef4444',
  green: '#34d399',
  purple: '#a78bfa',
  pink: '#f472b6',
  
  // Text
  white: '#ffffff',
  textPrimary: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  
  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.15)',
  borderCyan: 'rgba(56, 189, 248, 0.4)',
};

export const API_URL = 'https://api.sopranochat.com';
export const WS_URL = 'wss://api.sopranochat.com';
export const LIVEKIT_URL = 'wss://video.sopranochat.com';

export const AVATARS = [
  '/avatars/male_1.png', '/avatars/male_2.png', '/avatars/male_3.png', '/avatars/male_4.png',
  '/avatars/female_1.png', '/avatars/female_2.png', '/avatars/female_3.png', '/avatars/female_4.png',
  '/avatars/neutral_1.png', '/avatars/neutral_2.png', '/avatars/neutral_3.png', '/avatars/neutral_4.png',
];

// Web'deki avatar URL'lerini native'de kullanmak için tam URL yap
export const getAvatarUrl = (path: string) => {
  if (path.startsWith('http')) return path;
  return `https://sopranochat.com${path}`;
};

export const GENDERS = [
  { key: 'Erkek', label: '♂ Erkek', color: COLORS.cyan },
  { key: 'Kadın', label: '♀ Kadın', color: COLORS.pink },
  { key: 'Belirsiz', label: '⭐ Belirtme', color: COLORS.textSecondary },
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
  guest: { icon: '👤', color: '#ffffff', label: 'Misafir', level: 1 },
};
