import { api } from './api';

export interface LoginResponse {
    access_token: string;
    user: {
        userId: string;
        displayName: string;
        username: string;
        role: string;
        avatar?: string;
        email?: string;
        tenantId: string;
        gender?: string;
    };
}

export const authService = {
    /** Member login (email/username + password) */
    async login(tenantId: string, identifier: string, password: string): Promise<LoginResponse> {
        return api.post<LoginResponse>('/auth/login', {
            tenantId,
            identifier,
            password,
        });
    },

    /** Guest login (username only) */
    async guestLogin(username: string, avatar?: string, gender?: string, tenantId?: string): Promise<LoginResponse> {
        return api.post<LoginResponse>('/auth/guest', {
            username,
            avatar,
            gender,
            tenantId,
        });
    },

    /** Register new member */
    async register(data: {
        email: string;
        username: string;
        password: string;
        avatar?: string;
        gender?: string;
        tenantId?: string;
    }): Promise<LoginResponse> {
        return api.post<LoginResponse>('/auth/register', data);
    },

    /** Get current user profile */
    async getProfile(): Promise<any> {
        return api.get('/auth/profile');
    },
};
