export type ApiResponse<T = unknown> = {
  ok: boolean;
  mensaje?: string;
  message?: string;
  data: T;
  token?: string;
  pagination?: {
    currentPage?: number;
    totalPages?: number;
    totalItems?: number;
    itemsPerPage?: number;
  };
}