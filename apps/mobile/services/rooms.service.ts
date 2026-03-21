/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — Rooms Service
   Backend: /rooms/public, /rooms, /rooms/:id, /rooms/public/notifications
   ═══════════════════════════════════════════════════════════ */

import api from './api';
import type { Room, CreateRoomPayload, Notification } from '../types';

export const roomsService = {
  /**
   * Herkese açık odalar (auth gerektirmez)
   * GET /rooms/public
   */
  async getPublicRooms(): Promise<Room[]> {
    const { data } = await api.get<Room[]>('/rooms/public');
    return data;
  },

  /**
   * Kullanıcının erişebildiği odalar (tenant bazlı)
   * GET /rooms?tenantSlug=xxx
   */
  async getRooms(tenantSlug?: string): Promise<Room[]> {
    const params = tenantSlug ? { tenantSlug } : {};
    const { data } = await api.get<Room[]>('/rooms', { params });
    return data;
  },

  /**
   * Tek oda detayı
   * GET /rooms/:id
   */
  async getRoom(id: string): Promise<Room> {
    const { data } = await api.get<Room>(`/rooms/${id}`);
    return data;
  },

  /**
   * Oda oluştur
   * POST /rooms
   */
  async createRoom(payload: CreateRoomPayload): Promise<Room> {
    const { data } = await api.post<Room>('/rooms', payload);
    return data;
  },

  /**
   * Access code ile oda bul
   * GET /rooms/by-access/:code
   */
  async findByAccessCode(code: string): Promise<Room> {
    const { data } = await api.get<Room>(`/rooms/by-access/${code}`);
    return data;
  },

  /**
   * Slug ile tenant bul
   * GET /rooms/by-slug/:slug
   */
  async findBySlug(slug: string): Promise<any> {
    const { data } = await api.get(`/rooms/by-slug/${slug}`);
    return data;
  },

  /**
   * Bildirimler
   * GET /rooms/public/notifications
   */
  async getNotifications(): Promise<Notification[]> {
    const { data } = await api.get<Notification[]>('/rooms/public/notifications');
    return data;
  },

  /**
   * Bildirimleri okundu işaretle
   * POST /rooms/public/notifications/read
   */
  async markNotificationsRead(): Promise<void> {
    await api.post('/rooms/public/notifications/read');
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

export default roomsService;
