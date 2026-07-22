import { api } from '@/lib/axios';
import { unwrapApiResponse } from '@/lib/api-response';
import type { ApiResponse } from '@/types/api.types';

export interface TmsNotification {
  id: string;
  title: string;
  message: string;
  notificationType: string;
  data?: Record<string, unknown>;
  readAt?: string | null;
  createdAt: string;
}

export const notificationService = {
  async listMine() {
    const response = await api.get<ApiResponse<TmsNotification[]>>('/notifications/me');
    return unwrapApiResponse(response.data);
  },

  async markRead(id: string) {
    const response = await api.patch<ApiResponse<TmsNotification>>(`/notifications/${id}/read`);
    return unwrapApiResponse(response.data);
  },
};
