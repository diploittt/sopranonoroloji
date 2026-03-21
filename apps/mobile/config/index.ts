/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — Environment Config
   Platform-aware URL yönetimi
   ═══════════════════════════════════════════════════════════ */

import { Platform } from 'react-native';

// ── Localhost platform-aware ──
// Android emulator: localhost → 10.0.2.2
// iOS simulator / Web: localhost doğrudan çalışır
function getDevUrl(port: number): string {
  // Fiziksel cihaz — bilgisayarın ağ IP'sini kullan
  return `http://192.168.1.4:${port}`;
}

const DEV_API_URL = getDevUrl(3002);
const PROD_API_URL = 'https://api.sopranochat.com';

// Aktif ortam
const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : true;

// Lokal backend'e bağlan (dev modu)
const USE_LOCAL_BACKEND = false; // <-- PROD: Canlı sunucu (Google Play dağıtımı)

export const config = {
  // ── API ──
  API_BASE_URL: USE_LOCAL_BACKEND ? DEV_API_URL : PROD_API_URL,
  
  // ── WebSocket ──
  SOCKET_URL: USE_LOCAL_BACKEND ? DEV_API_URL : PROD_API_URL,
  
  // ── Varsayılan Tenant ──
  DEFAULT_TENANT_ID: 'default',
  DEFAULT_TENANT_SLUG: 'system',
  
  // ── Media / WebRTC ──
  MEDIA_CONFIG: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
    ],
  },
  
  // ── LiveKit (Cloud — tüm platformlar aynı sunucu) ──
  LIVEKIT_URL: 'wss://soprano-chat-98fpupmw.livekit.cloud',
  
  // ── Storage Keys ──
  STORAGE_KEYS: {
    AUTH_TOKEN: '@soprano_auth_token',
    USER_DATA: '@soprano_user_data',
    TENANT_ID: '@soprano_tenant_id',
  },
  
  // ── Timeouts ──
  REQUEST_TIMEOUT: 15000,
  
  // ── Pagination ──
  DEFAULT_PAGE_SIZE: 20,
  
  // ── Debug ──
  IS_DEV,
} as const;

export type Config = typeof config;
export default config;
