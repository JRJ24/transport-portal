export type ApiSuccessResponse<T = unknown> = {
  success: true;
  data: T;
  meta?: {
    requestId?: string;
    timestamp?: string;
  };
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code?: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId?: string;
    timestamp?: string;
    path?: string;
  };
};

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
