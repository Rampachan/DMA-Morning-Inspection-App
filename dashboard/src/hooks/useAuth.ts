import { getStoredUser, logout } from '../api/auth';
import type { User, UserRole } from '../types';

export interface UseAuthReturn {
  user: User | null;
  isAdmin: boolean;
  isDirector: boolean;
  logout: () => void;
}

/**
 * Synchronous hook that reads the current user from localStorage.
 * Token refresh / session management is handled by the Axios interceptor.
 */
export function useAuth(): UseAuthReturn {
  const user = getStoredUser();

  const hasRole = (role: UserRole) => user?.role === role;

  return {
    user,
    isAdmin: hasRole('admin'),
    isDirector: hasRole('director'),
    logout,
  };
}
