import axios from 'axios';

/**
 * Central Axios instance for all MCRS API calls.
 * - baseURL: from VITE_API_BASE_URL env var (set in .env / Vercel env)
 * - Request interceptor: attaches Bearer token from localStorage
 * - Response interceptor: on 401 clears session and redirects to /login
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor ────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    // When sending FormData, remove default Content-Type so the browser sets multipart/form-data with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    // Select appropriate token based on whether user is on commissioner route or main dashboard
    const isCommissionerRoute =
      typeof window !== 'undefined' &&
      window.location.pathname.startsWith('/commissioner');
    const token = isCommissionerRoute
      ? localStorage.getItem('mcrs_commissioner_token') || localStorage.getItem('mcrs_token')
      : localStorage.getItem('mcrs_token') || localStorage.getItem('mcrs_commissioner_token');

    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ── Response interceptor ───────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // If currently inside the Commissioner App, do not redirect to dashboard /login
      if (window.location.pathname.includes('/commissioner')) {
        localStorage.removeItem('mcrs_commissioner_token');
        localStorage.removeItem('mcrs_commissioner_session');
        return Promise.reject(error);
      }
      localStorage.removeItem('mcrs_token');
      localStorage.removeItem('mcrs_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default apiClient;
