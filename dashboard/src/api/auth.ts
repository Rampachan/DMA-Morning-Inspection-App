import apiClient from './client';
import type { AuthResponse, User } from '../types';

const TOKEN_KEY = 'mcrs_token';
const USER_KEY = 'mcrs_user';

/**
 * POST /auth/login
 * Stores token and user in localStorage on success.
 */
export async function login(username: string, password: string): Promise<User> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', {
    username,
    password,
  });
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

/**
 * Clears auth state and redirects to /login.
 */
export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = '/login';
}

/**
 * Returns the currently stored user or null.
 */
export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/**
 * Returns the stored JWT token or null.
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
