import api from './api';
import { saveToken, getToken, clearToken, saveUser, getUser, clearUser } from '../utils/secureStorage';
import { User } from '../types';

export interface LoginResponse {
  access_token: string;
  user: User;
}

/**
 * Authenticate against the backend.
 * Persists the JWT and user object on success.
 */
export async function login(username: string, password: string): Promise<User> {
  const response = await api.post<LoginResponse>('/auth/login', {
    username,
    password,
  });
  const { access_token, user } = response.data;
  await saveToken(access_token);
  await saveUser(user);
  return user;
}

/** Remove persisted credentials. */
export async function logout(): Promise<void> {
  await clearToken();
  await clearUser();
}

/** Return the currently authenticated user from secure storage, or null. */
export async function getCurrentUser(): Promise<User | null> {
  return getUser();
}

/** Return the current JWT token, or null. */
export async function getCurrentToken(): Promise<string | null> {
  return getToken();
}
