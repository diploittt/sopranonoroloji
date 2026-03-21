/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — Auth Service
   Backend: POST /auth/login, /auth/guest, /auth/register, /auth/update-profile
   ═══════════════════════════════════════════════════════════ */

import api, { setToken, setUserData, clearAuthData } from './api';
import type {
  AuthResponse,
  LoginPayload,
  GuestLoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  User,
} from '../types';

export const authService = {
  /**
   * Email/username + şifre ile giriş
   * POST /auth/login
   */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    await setToken(data.access_token);
    await setUserData(data.user);
    return data;
  },

  /**
   * Misafir girişi — sadece kullanıcı adı ve avatar
   * POST /auth/guest
   */
  async guestLogin(payload: GuestLoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/guest', payload);
    await setToken(data.access_token);
    await setUserData(data.user);
    return data;
  },

  /**
   * Yeni kayıt
   * POST /auth/register
   */
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    await setToken(data.access_token);
    await setUserData(data.user);
    return data;
  },

  /**
   * Profil güncelleme
   * POST /auth/update-profile
   */
  async updateProfile(payload: UpdateProfilePayload): Promise<User> {
    const { data } = await api.post<User>('/auth/update-profile', payload);
    await setUserData(data);
    return data;
  },

  /**
   * Çıkış — token ve user verisini temizle
   */
  async logout(): Promise<void> {
    await clearAuthData();
  },
};

export default authService;
