/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — Admin Service
   Backend: /admin/stats, /admin/customers, /admin/orders
   ═══════════════════════════════════════════════════════════ */

import api from './api';
import type {
  DashboardStats,
  Customer,
  CreateCustomerPayload,
  Order,
} from '../types';

export const adminService = {
  // ── Dashboard ──

  /**
   * Admin dashboard istatistikleri
   * GET /admin/stats
   */
  async getStats(): Promise<DashboardStats> {
    const { data } = await api.get<DashboardStats>('/admin/stats');
    return data;
  },

  // ── Müşteriler ──

  /**
   * Tüm müşteriler (tenants)
   * GET /admin/customers
   */
  async getCustomers(): Promise<Customer[]> {
    const { data } = await api.get<Customer[]>('/admin/customers');
    return data;
  },

  /**
   * Yeni müşteri oluştur (provisioning)
   * POST /admin/customers
   */
  async createCustomer(payload: CreateCustomerPayload): Promise<Customer> {
    const { data } = await api.post<Customer>('/admin/customers', payload);
    return data;
  },

  /**
   * Müşteri güncelle
   * PATCH /admin/customers/:id
   */
  async updateCustomer(id: string, payload: Partial<Customer>): Promise<Customer> {
    const { data } = await api.patch<Customer>(`/admin/customers/${id}`, payload);
    return data;
  },

  /**
   * Müşteri durumunu değiştir (aktif/pasif)
   * PATCH /admin/customers/:id/status
   */
  async toggleCustomerStatus(id: string, status: string): Promise<Customer> {
    const { data } = await api.patch<Customer>(`/admin/customers/${id}/status`, { status });
    return data;
  },

  /**
   * Müşteri sil
   * DELETE /admin/customers/:id
   */
  async deleteCustomer(id: string): Promise<void> {
    await api.delete(`/admin/customers/${id}`);
  },

  /**
   * Müşteri odaları
   * GET /admin/customers/:id/rooms
   */
  async getCustomerRooms(id: string): Promise<any[]> {
    const { data } = await api.get(`/admin/customers/${id}/rooms`);
    return data;
  },

  /**
   * Müşteri üyeleri
   * GET /admin/customers/:id/members
   */
  async getCustomerMembers(id: string): Promise<any[]> {
    const { data } = await api.get(`/admin/customers/${id}/members`);
    return data;
  },

  // ── Siparişler ──

  /**
   * Tüm siparişler
   * GET /admin/orders
   */
  async getOrders(status?: string): Promise<Order[]> {
    const params = status ? { status } : {};
    const { data } = await api.get<Order[]>('/admin/orders', { params });
    return data;
  },

  /**
   * Bekleyen sipariş sayısı
   * GET /admin/orders/pending-count
   */
  async getPendingOrderCount(): Promise<{ count: number }> {
    const { data } = await api.get('/admin/orders/pending-count');
    return data;
  },

  /**
   * Sipariş durumunu güncelle
   * PATCH /admin/orders/:id/status
   */
  async updateOrderStatus(id: string, status: string, notes?: string): Promise<Order> {
    const { data } = await api.patch<Order>(`/admin/orders/${id}/status`, { status, notes });
    return data;
  },

  // ── İletişim Mesajları ──

  async getContactMessages(params?: { unreadOnly?: boolean; page?: number; limit?: number }): Promise<any> {
    const { data } = await api.get('/admin/contact-messages', { params });
    return data;
  },

  // ── Sistem Logları ──

  async getSystemLogs(params?: { event?: string; page?: number; limit?: number }): Promise<any> {
    const { data } = await api.get('/admin/system-logs', { params });
    return data;
  },

  // ── Ayarlar ──

  async getSettings(): Promise<any> {
    const { data } = await api.get('/admin/settings');
    return data;
  },

  async updateSettings(body: Record<string, any>): Promise<any> {
    const { data } = await api.patch('/admin/settings', body);
    return data;
  },
};

export default adminService;
