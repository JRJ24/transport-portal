import type { ApiResponse } from "@/types/api.types";
import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

export const mainBase = window.location.hostname.includes("localhost")
  ? import.meta.env.VITE_API_URL_DEV || "/api"
  : import.meta.env.VITE_API_URL_PROD || "/api";

export const altBase = window.location.hostname.includes("localhost")
  ? import.meta.env.VITE_API_ALT_URL_DEV || "/api-alt"
  : import.meta.env.VITE_API_ALT_URL_DEV || "/api-alt";

const tokenKey = "token";

export const tokenManager = {
  get(): string | null {
    return sessionStorage.getItem(tokenKey) || localStorage.getItem(tokenKey);
  },
  set(token: string, persist: "session" | "local" = "session") {
    if (persist === "local") localStorage.setItem(tokenKey, token);
    else sessionStorage.setItem(tokenKey, token);
  },
  clear() {
    sessionStorage.removeItem(tokenKey);
    localStorage.removeItem(tokenKey);
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
      // Tipado seguro para headers
      config.headers["x-access-token"] = token;
    }
  }
  return config;
});

altApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const useCookiesOnly = config.headers?.["X-Use-Cookies-Only"] === "1";

  if (!useCookiesOnly) {
    const token = tokenManager.get();
    if (token) {
      // Tipado seguro para headers
      config.headers["x-access-token"] = token;
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
  // Aquí usamos el DTO de lo que devuelve tu backend al refrescar
  const { data } = await baseAxios.post<
    ApiResponse<{ accessToken?: string; token?: string }>
  >(`${mainBase}/auth/refresh-token`, {});

  const newToken = data.data?.accessToken || data.data?.token;

  if (!newToken) throw new Error("No token in refresh response");
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
      requestUrl.includes("/api/auth/login") ||
      requestUrl.includes("/api/auth/register");

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
            original.headers["x-access-token"] = newToken;
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
            original.headers["x-access-token"] = token;
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
      return api(original);
    }

    const requestUrl = original?.url ?? "";
    const hasStoredToken = Boolean(tokenManager.get());
    const isAuthRequest =
      requestUrl.includes("/api/auth/login") ||
      requestUrl.includes("/api/auth/register");

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
            original.headers["x-access-token"] = newToken;
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
            original.headers["x-access-token"] = token;
          }
          resolve(api(original));
        });
      });
    }

    return Promise.reject(error);
  },
);