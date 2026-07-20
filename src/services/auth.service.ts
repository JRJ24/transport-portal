import { api, tokenManager } from '@/lib/axios';
import { unwrapApiResponse } from '@/lib/api-response';
import type { ApiResponse } from '@/types/api.types';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  status: string;
  roles: string[];
  permissions?: string[];
  sessionId?: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
  sessionId: string;
}

export const authService = {
  async login(input: { email: string; password: string; remember: boolean }) {
    const response = await api.post<ApiResponse<AuthResult>>('/auth/login', {
      email: input.email,
      password: input.password,
      platform: 'web',
      deviceName: 'transport-portal',
    });
    const result = unwrapApiResponse(response.data);
    tokenManager.setTokens(result, input.remember ? 'local' : 'session');
    localStorage.setItem('user', JSON.stringify(result.user));
    return result.user;
  },

  async me() {
    const response = await api.get<ApiResponse<AuthUser>>('/auth/me');
    const user = unwrapApiResponse(response.data);
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      tokenManager.clear();
    }
  },
};
