import type { JSX } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

export function ProtectedRoute({ roles }: { roles?: UserRole[] }): JSX.Element {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
