/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — Merkezi API Client
   Axios instance + auth interceptors + error handling
   ═══════════════════════════════════════════════════════════ */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';
import { ApiError } from '../types';

// ── Axios Instance ──
const api: AxiosInstance = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: config.REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Token Yönetimi ──

export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(config.STORAGE_KEYS.AUTH_TOKEN, token);
}

export async function removeToken(): Promise<void> {
  await AsyncStorage.removeItem(config.STORAGE_KEYS.AUTH_TOKEN);
}

export async function setUserData(user: any): Promise<void> {
  await AsyncStorage.setItem(config.STORAGE_KEYS.USER_DATA, JSON.stringify(user));
}

export async function getUserData(): Promise<any | null> {
  try {
    const data = await AsyncStorage.getItem(config.STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function clearAuthData(): Promise<void> {
  await AsyncStorage.multiRemove([
    config.STORAGE_KEYS.AUTH_TOKEN,
    config.STORAGE_KEYS.USER_DATA,
    config.STORAGE_KEYS.TENANT_ID,
  ]);
}

// ── Request Interceptor — her isteğe token ekle ──
api.interceptors.request.use(
  async (cfg: InternalAxiosRequestConfig) => {
    // SADECE eğer Authorization header önceden (örn: getConfig bypass) ayarlanmamışsa AsyncStorage okunsun
    if (cfg.headers && !cfg.headers.Authorization) {
      const token = await getToken();
      if (token) {
        cfg.headers.Authorization = `Bearer ${token}`;
      }
    }
    return cfg;
  },
  (error) => Promise.reject(error),
);

// ── Response Interceptor — hata yönetimi ──
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response) {
      const { status, data } = error.response;

      // 401 → token geçersiz, session temizle
      if (status === 401) {
        clearAuthData();
        // Burada navigation event emit edilebilir
      }

      return Promise.reject({
        message: data?.message || 'Bir hata oluştu',
        statusCode: status,
        error: data?.error,
      } as ApiError);
    }

    // Network hatası
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({
        message: 'İstek zaman aşımına uğradı',
        statusCode: 408,
      } as ApiError);
    }

    return Promise.reject({
      message: 'Sunucuya bağlanılamadı',
      statusCode: 0,
    } as ApiError);
  },
);

export default api;
