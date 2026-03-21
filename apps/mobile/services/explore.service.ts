/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — Explore Service
   Backend: /rooms/public, /rooms/public/tenants, /rooms/public/users
   ═══════════════════════════════════════════════════════════ */

import api from './api';
import type { Room, Tenant } from '../types';

export const exploreService = {
  /**
   * Keşfet — herkese açık aktif odalar
   * GET /rooms/public
   */
  async getPublicRooms(): Promise<Room[]> {
    const { data } = await api.get<Room[]>('/rooms/public');
    return data;
  },

  /**
   * Aktif tenant listesi (müşteri platformları)
   * GET /rooms/public/tenants
   */
  async getPublicTenants(): Promise<Tenant[]> {
    const { data } = await api.get('/rooms/public/tenants');
    // Backend { sopranoChatCustomers, ownDomainCustomers } objesi döner
    const sc = Array.isArray(data?.sopranoChatCustomers) ? data.sopranoChatCustomers : [];
    const od = Array.isArray(data?.ownDomainCustomers) ? data.ownDomainCustomers : [];
    return [...sc, ...od];
  },

  /**
   * Herkese açık kullanıcılar
   * GET /rooms/public/users
   */
  async getPublicUsers(): Promise<any[]> {
    const { data } = await api.get('/rooms/public/users');
    return data;
  },
};

export default exploreService;
