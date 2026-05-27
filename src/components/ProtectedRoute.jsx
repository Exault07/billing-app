import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — wraps routes that require authentication.
 * Optionally restricts by role(s).
 *
 * Usage:
 *   <Route element={<ProtectedRoute />}> ... </Route>
 *   <Route element={<ProtectedRoute allowedRoles={['owner','staff']} />}> ... </Route>
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();

  // Still initialising auth
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-surface-500 text-sm font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  // Not logged in → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but role hasn't resolved yet — wait instead of redirecting
  if (allowedRoles && role === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-surface-500 text-sm font-medium">Checking permissions...</span>
        </div>
      </div>
    );
  }

  // Logged in but role not allowed → redirect to unauthorized
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
