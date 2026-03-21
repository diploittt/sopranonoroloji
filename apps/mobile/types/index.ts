/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — Merkezi TypeScript Tipleri
   Mevcut backend Prisma şemasıyla uyumlu
   ═══════════════════════════════════════════════════════════ */

// ── AUTH ──

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface LoginPayload {
  tenantId?: string;
  username?: string;
  email?: string;
  password: string;
}

export interface GuestLoginPayload {
  username: string;
  avatar?: string;
  gender?: string;
  tenantId?: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  avatar?: string;
  gender?: string;
  tenantId?: string;
}

export interface UpdateProfilePayload {
  displayName?: string;
  avatar?: string;
  email?: string;
  password?: string;
  gender?: string;
}

// ── USER ──

export interface User {
  id: string;
  email?: string;
  username: string;
  displayName?: string;
  avatar?: string;
  gender?: string;
  role: UserRole;
  tenantId?: string;
  balance?: number;
  isGuest?: boolean;
  createdAt?: string;
}

export type UserRole = 'guest' | 'member' | 'vip' | 'operator' | 'dj' | 'moderator' | 'admin' | 'superadmin' | 'super_admin' | 'owner' | 'godmaster';

// ── ROOM ──

export interface Room {
  id: string;
  name: string;
  slug?: string;
  tenantId: string;
  maxParticipants?: number;
  password?: string;
  announcement?: string;
  isActive?: boolean;
  isLocked?: boolean;
  isVipRoom?: boolean;
  isMeetingRoom?: boolean;
  status?: string;
  buttonColor?: string | null;
  createdAt?: string;
  participantCount?: number;
  activeParticipants?: RoomParticipant[];
}

export interface RoomParticipant {
  id: string;
  userId: string;
  roomId: string;
  role?: string;
  isMuted?: boolean;
  isSpeaking?: boolean;
  user?: User;
}

export interface CreateRoomPayload {
  name: string;
  slug?: string;
  password?: string;
  announcement?: string;
  maxParticipants?: number;
}

// ── NOTIFICATION ──

export interface Notification {
  id: string;
  type: 'invite' | 'message' | 'follow' | 'system' | 'like';
  title: string;
  body?: string;
  fromUser?: User;
  roomId?: string;
  isRead: boolean;
  createdAt: string;
}

// ── CUSTOMER (SaaS Tenant) ──

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  domain?: string;
  slug: string;
  package?: string;
  maxRooms?: number;
  maxUsers?: number;
  status: 'active' | 'passive' | 'suspended';
  roomCount?: number;
  userCount?: number;
  createdAt?: string;
  expiresAt?: string;
}

export interface CreateCustomerPayload {
  clientName: string;
  email: string;
  phone?: string;
  domain?: string;
  hostingType?: 'soprano' | 'own';
  packageRoomCount?: number;
  packageUserLimit?: number;
  packageCameraEnabled?: boolean;
  packageMeetingEnabled?: boolean;
  paymentAmount?: number;
  paymentCurrency?: string;
  billingPeriod?: string;
}

// ── PACKAGE PLAN ──

export interface PackagePlan {
  id: string;
  name: string;
  capacity: number;
  maxRooms: number;
  price: number;
  currency: string;
  billingPeriod: 'monthly' | 'yearly';
  features: string[];
}

// ── TENANT ──

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo?: string;
  isActive: boolean;
  createdAt?: string;
  firstRoom?: string;
  firstRoomName?: string;
  roomCount?: number;
  onlineUsers?: number;
  rooms?: { id: string; name: string; slug: string; onlineUsers: number }[];
}

// ── DOMAIN ──

export interface Domain {
  id: string;
  domain: string;
  tenantId: string;
  isVerified: boolean;
  createdAt?: string;
}

// ── ORDER ──

export interface Order {
  id: string;
  clientName: string;
  email: string;
  phone?: string;
  package?: string;
  amount: number;
  currency?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  createdAt: string;
}

// ── DASHBOARD STATS ──

export interface DashboardStats {
  totalCustomers: number;
  activeRooms: number;
  onlineUsers: number;
  monthlyRevenue: number;
  pendingOrders: number;
  activeSpeakers?: number;
}

// ── GENERIC ──

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
