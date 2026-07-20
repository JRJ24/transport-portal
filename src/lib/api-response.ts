import type { ApiResponse } from '@/types/api.types';

export function unwrapApiResponse<T>(response: ApiResponse<T>): T {
  if (response.success) {
    return response.data;
  }

  throw new Error(response.error.message || 'Error de API');
}
