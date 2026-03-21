import api from './api';
import { useStore } from '../store';

const getConfig = (extraConfig: any = {}) => {
  const state = useStore.getState();
  const activeTenantId = state.activeTenantId;
  const token = state.token;
  
  const config = { ...extraConfig };
  config.headers = { ...config.headers };
  
  if (activeTenantId) {
    config.headers['x-tenant-id'] = activeTenantId;
  }
  if (token) {
    // API interceptor'daki AsyncStorage okumasını bypass et
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
};

export const tenantAdminService = {
  // ── Users ──
  getUsers(filters?: { search?: string; role?: string; page?: number; limit?: number }) {
    return api.get('/admin/users', getConfig({ params: filters })).then(res => res.data);
  },
  getUserDetail(userId: string) {
    return api.get(`/admin/users/${userId}`, getConfig()).then(res => res.data);
  },
  updateUser(userId: string, data: Record<string, any>) {
    return api.patch(`/admin/users/${userId}`, data, getConfig()).then(res => res.data);
  },
  deleteUser(userId: string) {
    return api.delete(`/admin/users/${userId}`, getConfig()).then(res => res.data);
  },
  createMember(data: any) {
    return api.post('/admin/members', data, getConfig()).then(res => res.data);
  },

  // ── Rooms ──
  getRooms() {
    return api.get('/admin/rooms', getConfig()).then(res => res.data);
  },
  createRoom(data: any) {
    return api.post('/admin/rooms', data, getConfig()).then(res => res.data);
  },
  updateRoom(roomId: string, data: Record<string, any>) {
    return api.patch(`/admin/rooms/${roomId}`, data, getConfig()).then(res => res.data);
  },
  deleteRoom(roomId: string) {
    return api.delete(`/admin/rooms/${roomId}`, getConfig()).then(res => res.data);
  },
  closeRoom(roomId: string) {
    return api.post(`/admin/rooms/${roomId}/close`, {}, getConfig()).then(res => res.data);
  },

  // ── Bans ──
  getBans(filters?: { type?: string; active?: boolean }) {
    return api.get('/admin/bans', getConfig({ params: filters })).then(res => res.data);
  },
  createBan(data: { userId: string; type?: string; duration?: string; reason?: string; ip?: string }) {
    return api.post('/admin/bans', data, getConfig()).then(res => res.data);
  },
  removeBan(banId: string) {
    return api.delete(`/admin/bans/${banId}`, getConfig()).then(res => res.data);
  },

  // ── IP Bans ──
  getIpBans() {
    return api.get('/admin/ipbans', getConfig()).then(res => res.data);
  },
  createIpBan(data: { ip: string; reason?: string }) {
    return api.post('/admin/ipbans', data, getConfig()).then(res => res.data);
  },
  removeIpBan(banId: string) {
    return api.delete(`/admin/ipbans/${banId}`, getConfig()).then(res => res.data);
  },

  // ── Words ──
  getWordFilters() {
    return api.get('/admin/words', getConfig()).then(res => res.data);
  },
  createWordFilter(data: { badWord: string; replacement?: string }) {
    return api.post('/admin/words', data, getConfig()).then(res => res.data);
  },
  removeWordFilter(filterId: string) {
    return api.delete(`/admin/words/${filterId}`, getConfig()).then(res => res.data);
  },

  // ── Logs ──
  getAuditLogs(filters?: { event?: string; userId?: string; page?: number; limit?: number }) {
    return api.get('/admin/audit-logs', getConfig({ params: { ...filters, excludeSystemEvents: true } })).then(res => res.data);
  },

  // ── Settings ──
  getSettings() {
    return api.get('/admin/settings', getConfig()).then(res => res.data);
  },
  updateSettings(data: Record<string, any>) {
    return api.patch('/admin/settings', data, getConfig()).then(res => res.data);
  },
};

export default tenantAdminService;
