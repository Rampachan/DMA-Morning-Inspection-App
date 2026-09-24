import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import StatusBoard from './pages/StatusBoard';
import SubmissionDetail from './pages/SubmissionDetail';
import ReportsPage from './pages/ReportsPage';
import UserManagement from './pages/UserManagement';
import CategoryManagement from './pages/CategoryManagement';
import CommissionerApp from './pages/CommissionerApp';

/**
 * Root application router.
 *
 * Route protection:
 *  - /login          → public
 *  - /commissioner   → public / commissioner simulator
 *  - /               → redirect to /dashboard
 *  - /dashboard      → any authenticated user
 *  - /submissions/:id → any authenticated user
 *  - /reports        → any authenticated user
 *  - /users          → admin only
 *  - /categories     → admin only
 */
export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/commissioner" element={<CommissionerApp />} />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Protected — any authenticated role */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <StatusBoard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/submissions/:id"
        element={
          <ProtectedRoute>
            <SubmissionDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      {/* Protected — admin only */}
      <Route
        path="/users"
        element={
          <ProtectedRoute requiredRole="admin">
            <UserManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/categories"
        element={
          <ProtectedRoute requiredRole="admin">
            <CategoryManagement />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
