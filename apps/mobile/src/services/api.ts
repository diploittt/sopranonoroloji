import { API_URL } from '../constants';

// Auth API
export const loginGuest = async (nickname: string, gender: string, avatar: string) => {
  const res = await fetch(`${API_URL}/auth/guest-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, gender, avatar }),
  });
  return res.json();
};

export const loginMember = async (username: string, password: string) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
};

export const registerMember = async (data: { username: string; email: string; password: string; gender: string }) => {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

// Rooms API
export const fetchRooms = async (token?: string) => {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/rooms`, { headers });
  return res.json();
};

// Customers API
export const fetchCustomers = async () => {
  const res = await fetch(`${API_URL}/customers/public`);
  return res.json();
};

// Profile API
export const updateProfile = async (token: string, field: string, value: string) => {
  const res = await fetch(`${API_URL}/auth/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ [field]: value }),
  });
  return res.json();
};
