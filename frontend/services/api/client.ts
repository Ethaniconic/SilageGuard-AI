/**
 * SILAGEGUARD AI V4 — HTTP REST Client Engine
 * Fully offline-resilient HTTP client consuming FastAPI backend endpoints.
 * Never throws unhandled network errors into UI components.
 */

import { API_CONFIG } from "../../constants/api";
import { storageService } from "../storage/storageService";
import { AuthTokens } from "../../types/backend";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  isOffline?: boolean;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_CONFIG.DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async getAuthHeader(): Promise<Record<string, string>> {
    const tokens = await storageService.getTokens();
    if (tokens?.accessToken) {
      return { Authorization: `Bearer ${tokens.accessToken}` };
    }
    return {};
  }

  public async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = API_CONFIG.RETRY_ATTEMPTS
  ): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
    const authHeaders = await this.getAuthHeader();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders,
      ...(options.headers as Record<string, string>),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 401 Unauthorized -> Attempt token refresh
      if (response.status === 401 && retryCount > 0) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          return this.request<T>(endpoint, options, retryCount - 1);
        }
      }

      const responseText = await response.text();
      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = { raw: responseText };
      }

      if (!response.ok) {
        return {
          success: false,
          error: data?.detail || data?.message || `HTTP ${response.status}`,
          statusCode: response.status,
          data,
        };
      }

      return {
        success: true,
        data,
        statusCode: response.status,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);

      // Retry transient network failures
      if (retryCount > 0 && err.name !== "AbortError") {
        await new Promise((r) => setTimeout(r, API_CONFIG.RETRY_DELAY_MS));
        return this.request<T>(endpoint, options, retryCount - 1);
      }

      return {
        success: false,
        error: err.name === "AbortError" ? "Request timed out" : "Network unavailable (Offline)",
        isOffline: true,
      };
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const tokens = await storageService.getTokens();
      if (!tokens?.refreshToken) return false;

      const refreshUrl = `${this.baseUrl}${API_CONFIG.ENDPOINTS.AUTH_REFRESH}`;
      const response = await fetch(refreshUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: tokens.refreshToken }),
      });

      if (response.ok) {
        const newTokens: AuthTokens = await response.json();
        await storageService.saveTokens(newTokens);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public get<T = any>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET", headers });
  }

  public post<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T = any>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE", headers });
  }
}

export const apiClient = new ApiClient();
