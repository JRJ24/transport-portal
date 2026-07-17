/* eslint-disable @typescript-eslint/no-unused-vars */
import { api, altApi, mainBase, altBase } from "@/lib/axios";
import type { ApiResponse } from "@/types/api.types";
import { type AxiosRequestConfig, AxiosError } from "axios";

type BaseOpt = "main" | "alt" | string;
type Method = "get" | "post" | "put" | "patch" | "delete";

export interface RequestOpts {
  base?: BaseOpt;
  useCookiesOnly?: boolean;
  headers?: Record<string, string>;
  data?: unknown;
  timeoutMs?: number;
  params?: Record<string, unknown>;
}

function resolveBase(opt?: BaseOpt): string {
  if (!opt || opt === "main") return mainBase;
  if (opt === "alt") return altBase;
  return opt;
}

function buildURL(endpoint: string, base: string): string {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  const left = base.endsWith("/") ? base.slice(0, -1) : base;
  const right = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  return `${left}/${right}`;
}

async function request<T>(
  method: Method,
  endpoint: string,
  payload?: unknown,
  opts?: RequestOpts,
): Promise<ApiResponse<T>> {
  // const url = endpoint;

  const headers: Record<string, string> = { ...(opts?.headers || {}) };

  if (opts?.useCookiesOnly) {
    headers["X-Use-Cookies-Only"] = "1";
  }

  const config: AxiosRequestConfig = {
    url: endpoint,
    method,
    withCredentials: true,
    headers,
    timeout: opts?.timeoutMs ?? 20000,
    params: opts?.params,
  };

  if (["post", "put", "patch"].includes(method)) {
    config.data = payload;
  } else if (method === "delete") {
    config.data = opts?.data ?? payload;
  }

  try {
    const client = opts?.base === "alt" ? altApi : api;
    const res = await client.request<ApiResponse<T>>(config);
    return res.data;
  } catch (err) {
    const axiosError = err as AxiosError<ApiResponse<T>>;

    if (axiosError.response?.data) {
      return axiosError.response.data;
    }

    return {
      ok: false,
      mensaje: "Error de conexión",
      message: axiosError.message,
      data: null as T,
    };
  }
}

const http = {
  getApi<T>(endPoint: string, opts?: RequestOpts) {
    return request<T>("get", endPoint, undefined, opts);
  },
  postApi<T>(endPoint: string, data: unknown, opts?: RequestOpts) {
    return request<T>("post", endPoint, data, opts);
  },
  putApi<T>(endPoint: string, data: unknown, opts?: RequestOpts) {
    return request<T>("put", endPoint, data, opts);
  },
  patchApi<T>(endPoint: string, data: unknown, opts?: RequestOpts) {
    return request<T>("patch", endPoint, data, opts);
  },
  deleteApi<T>(endPoint: string, data?: unknown, opts?: RequestOpts) {
    return request<T>("delete", endPoint, data, opts);
  },
};

export default http;