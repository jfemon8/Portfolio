import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/States';
import type { UserRole } from '@/types';

// Defence-in-depth RBAC guard — the backend also enforces this.
export default function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[];
  children: ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Spinner label="Checking access…" />
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
