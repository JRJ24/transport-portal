import type { ApiResponse } from "@/types/api.types";
import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

export const mainBase = window.location.hostname.includes("localhost")
  ? import.meta.env.VITE_API_URL_DEV || "/api/v1"
  : import.meta.env.VITE_API_URL_PROD || "/api/v1";

export const altBase = window.location.hostname.includes("localhost")
  ? import.meta.env.VITE_API_ALT_URL_DEV || "/api-alt"
  : import.meta.env.VITE_API_ALT_URL_PROD || "/api-alt";

const accessTokenKey = "accessToken";
const refreshTokenKey = "refreshToken";

export const tokenManager = {
  get(): string | null {
    return (
      sessionStorage.getItem(accessTokenKey) ||
      localStorage.getItem(accessTokenKey)
    );
  },
  getRefresh(): string | null {
    return (
      sessionStorage.getItem(refreshTokenKey) ||
      localStorage.getItem(refreshTokenKey)
    );
  },
  set(token: string, persist: "session" | "local" = "session") {
    if (persist === "local") localStorage.setItem(accessTokenKey, token);
    else sessionStorage.setItem(accessTokenKey, token);
  },
  setRefresh(token: string, persist: "session" | "local" = "session") {
    if (persist === "local") localStorage.setItem(refreshTokenKey, token);
    else sessionStorage.setItem(refreshTokenKey, token);
  },
  setTokens(
    tokens: { accessToken: string; refreshToken: string },
    persist: "session" | "local" = "session",
  ) {
    this.set(tokens.accessToken, persist);
    this.setRefresh(tokens.refreshToken, persist);
  },
  clear() {
    sessionStorage.removeItem(accessTokenKey);
    sessionStorage.removeItem(refreshTokenKey);
    localStorage.removeItem(accessTokenKey);
    localStorage.removeItem(refreshTokenKey);
    localStorage.removeItem("user");
  },
};

// Instancia para llamadas internas (como el refresh) que no deben entrar en bucle
const baseAxios = axios.create({
  withCredentials: true,
  timeout: 20000,
});

export const api = axios.create({
  baseURL: mainBase,
  withCredentials: true,
  timeout: 20000,
});

export const altApi = axios.create({
  baseURL: altBase,
  withCredentials: true,
  timeout: 20000,
});

// --- INTERCEPTOR DE PETICIÓN ---
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const useCookiesOnly = config.headers?.["X-Use-Cookies-Only"] === "1";

  if (!useCookiesOnly) {
    const token = tokenManager.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

altApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const useCookiesOnly = config.headers?.["X-Use-Cookies-Only"] === "1";

  if (!useCookiesOnly) {
    const token = tokenManager.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// --- LÓGICA DE REFRESH TOKEN ---
let isRefreshing = false;
type QueueItem = (token?: string) => void;
let pendingQueue: QueueItem[] = [];

function processQueue(token?: string) {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
}

async function doRefresh(): Promise<string> {
  const refreshToken = tokenManager.getRefresh();

  if (!refreshToken) throw new Error("No refresh token available");

  const { data } = await baseAxios.post<
    ApiResponse<{ accessToken: string; refreshToken: string }>
  >(`${mainBase}/auth/refresh`, { refreshToken });

  const newToken = data.success ? data.data.accessToken : undefined;
  const nextRefreshToken = data.success ? data.data.refreshToken : undefined;

  if (!newToken) throw new Error("No token in refresh response");
  if (nextRefreshToken) tokenManager.setRefresh(nextRefreshToken);
  tokenManager.set(newToken);
  return newToken;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiResponse>) => {
    const original = error.config as AxiosRequestConfig & {
      _retry?: boolean;
      _transientTried?: boolean;
    };

    const status = error.response?.status;

    const transientStatuses = [429, 502, 503, 504];
    const isTimeout = error.code === "ECONNABORTED";

    if (
      (isTimeout || transientStatuses.includes(status ?? 0)) &&
      !original?._transientTried
    ) {
      original._transientTried = true;
      await new Promise((r) => setTimeout(r, 800));
      return api(original);
    }

    const requestUrl = original?.url ?? "";
    const hasStoredToken = Boolean(tokenManager.get());
    const isAuthRequest =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/refresh");

    if (
      status === 401 &&
      !original?._retry &&
      hasStoredToken &&
      !isAuthRequest
    ) {
      original._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await doRefresh();
          processQueue(newToken);

          if (original.headers) {
            original.headers.Authorization = `Bearer ${newToken}`;
          }

          return api(original);
        } catch (e) {
          processQueue(undefined);
          tokenManager.clear();
          window.location.href = "/login";
          return Promise.reject(e);
        } finally {
          isRefreshing = false;
        }
      }

      return new Promise((resolve, reject) => {
        pendingQueue.push((token) => {
          if (!token) {
            reject(error);
            return;
          }
          if (original.headers) {
            original.headers.Authorization = `Bearer ${token}`;
          }
          resolve(api(original));
        });
      });
    }

    return Promise.reject(error);
  },
);

altApi.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiResponse>) => {
    const original = error.config as AxiosRequestConfig & {
      _retry?: boolean;
      _transientTried?: boolean;
    };

    const status = error.response?.status;

    const transientStatuses = [429, 502, 503, 504];
    const isTimeout = error.code === "ECONNABORTED";

    if (
      (isTimeout || transientStatuses.includes(status ?? 0)) &&
      !original?._transientTried
    ) {
      original._transientTried = true;
      await new Promise((r) => setTimeout(r, 800));
      return altApi(original);
    }

    const requestUrl = original?.url ?? "";
    const hasStoredToken = Boolean(tokenManager.get());
    const isAuthRequest =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/refresh");

    if (
      status === 401 &&
      !original?._retry &&
      hasStoredToken &&
      !isAuthRequest
    ) {
      original._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await doRefresh();
          processQueue(newToken);

          if (original.headers) {
            original.headers.Authorization = `Bearer ${newToken}`;
          }

          return altApi(original);
        } catch (e) {
          processQueue(undefined);
          tokenManager.clear();
          window.location.href = "/login";
          return Promise.reject(e);
        } finally {
          isRefreshing = false;
        }
      }

      return new Promise((resolve, reject) => {
        pendingQueue.push((token) => {
          if (!token) {
            reject(error);
            return;
          }
          if (original.headers) {
            original.headers.Authorization = `Bearer ${token}`;
          }
          resolve(altApi(original));
        });
      });
    }

    return Promise.reject(error);
  },
);
