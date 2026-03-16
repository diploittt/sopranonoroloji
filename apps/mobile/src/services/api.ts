import { API_URL, DEFAULT_TENANT_ID } from '../constants';

// Auth API
export const loginGuest = async (username: string, gender: string, avatar: string) => {
  try {
    const res = await fetch(`${API_URL}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, gender, avatar }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: true, message: data?.message || `Sunucu hatası: ${res.status}` };
    }
    return data;
  } catch (e: any) {
    console.error('loginGuest error:', e);
    return { error: true, message: `Bağlantı hatası: ${e.message}` };
  }
};

export const loginMember = async (username: string, password: string) => {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, tenantId: DEFAULT_TENANT_ID }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: true, message: data?.message || `Sunucu hatası: ${res.status}` };
    }
    return data;
  } catch (e: any) {
    console.error('loginMember error:', e);
    return { error: true, message: `Bağlantı hatası: ${e.message}` };
  }
};

export const registerMember = async (data: { username: string; email: string; password: string; gender: string }) => {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      return { error: true, message: result?.message || `Sunucu hatası: ${res.status}` };
    }
    return result;
  } catch (e: any) {
    console.error('register error:', e);
    return { error: true, message: `Bağlantı hatası: ${e.message}` };
  }
};

// Tenants (Müşteri Platformları) API
export const fetchCustomers = async () => {
  try {
    const res = await fetch(`${API_URL}/tenants/public`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e: any) {
    console.error('fetchCustomers error:', e);
    return [];
  }
};

// Rooms API
export const fetchRooms = async (token?: string) => {
  try {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/rooms/public`, { headers });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e: any) {
    console.error('fetchRooms error:', e);
    return [];
  }
};

// Profile API
export const updateProfile = async (token: string, body: Record<string, string>) => {
  try {
    const res = await fetch(`${API_URL}/auth/update-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return res.json();
  } catch (e: any) {
    console.error('updateProfile error:', e);
    return { error: true, message: `Bağlantı hatası: ${e.message}` };
  }
};
