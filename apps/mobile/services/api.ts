import { API_BASE_URL } from '@/constants';

class ApiClient {
    private baseUrl = API_BASE_URL;
    private token: string | null = null;

    setToken(token: string | null) {
        this.token = token;
    }

    private async request<T = any>(
        path: string,
        options: RequestInit = {}
    ): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...((options.headers as Record<string, string>) || {}),
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const res = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers,
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(error.message || `HTTP ${res.status}`);
        }

        return res.json();
    }

    get<T = any>(path: string) {
        return this.request<T>(path, { method: 'GET' });
    }

    post<T = any>(path: string, body?: any) {
        return this.request<T>(path, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    patch<T = any>(path: string, body?: any) {
        return this.request<T>(path, {
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    del<T = any>(path: string) {
        return this.request<T>(path, { method: 'DELETE' });
    }
}

export const api = new ApiClient();
