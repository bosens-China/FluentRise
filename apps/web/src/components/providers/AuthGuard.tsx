/**
 * 统一的路由认证守卫。
 */

import { Navigate, useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';

import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { syncAuthSession, useIsAuthenticated, useUser } from '@/stores/userStore';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAssessment?: boolean;
}

export function AuthGuard({
  children,
  fallback,
  requireAssessment = false,
}: AuthGuardProps) {
  const location = useLocation();
  const isAuthed = useIsAuthenticated();
  const user = useUser();

  useEffect(() => {
    syncAuthSession();
  }, []);

  if (isAuthed === undefined) {
    return fallback ? <>{fallback}</> : <LoadingScreen />;
  }

  if (!isAuthed) {
    return (
      <Navigate
        to="/login"
        search={{ redirect: location.pathname + location.search }}
        replace
      />
    );
  }

  if (requireAssessment && user && !user.has_completed_assessment) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
