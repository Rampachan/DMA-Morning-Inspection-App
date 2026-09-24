import { Navigate } from 'react-router-dom';
import { getToken, getStoredUser } from '../api/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If provided, only users with this role can access the route */
  requiredRole?: 'admin' | 'director';
}

/**
 * Wraps protected routes.
 * - If no token → redirect to /login
 * - If role requirement is not met → show inline 403 message
 */
export default function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const token = getToken();
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-xl shadow-md p-10 text-center max-w-md">
          <p className="text-6xl mb-4">🚫</p>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-500">
            You do not have permission to view this page. This area requires the{' '}
            <span className="font-semibold text-brand-700">{requiredRole}</span> role.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
