import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE } from '../config';
import { getToken, clearToken, clearUser } from '../utils/secureStorage';

/**
 * Singleton axios instance used by all services.
 * A reference to a navigation reset function can be injected at runtime
 * (see App.tsx) so that 401 responses redirect to the Login screen.
 */
let _navigateToLogin: (() => void) | null = null;

export function setNavigateToLogin(fn: () => void): void {
  _navigateToLogin = fn;
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
  headers: {
    Accept: 'application/json',
  },
});

// ── Request interceptor: attach Bearer token ──────────────────────────────────
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    // If sending FormData, delete Content-Type so React Native generates the multipart boundary
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }
    const token = await getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: handle 401 globally ─────────────────────────────────
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear stored credentials
      await clearToken();
      await clearUser();
      // Navigate back to login if handler is registered
      _navigateToLogin?.();
    }
    return Promise.reject(error);
  },
);

export default api;
