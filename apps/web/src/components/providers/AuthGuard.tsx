/**
 * AuthGuard - 统一的路由认证守卫
 * 
 * 替代每个路由重复写 beforeLoad 检查
 * 用法：在需要认证的布局组件中包裹
 */

import { Navigate, useLocation } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { isAuthenticated } from '@/utils/request';
import { getCachedUserInfo } from '@/api/user';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAssessment?: boolean;
}

export function AuthGuard({ 
  children, 
  fallback,
  requireAssessment = false 
}: AuthGuardProps) {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [hasAssessment, setHasAssessment] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const authed = isAuthenticated();
      setIsAuthed(authed);
      
      if (authed && requireAssessment) {
        const user = getCachedUserInfo();
        setHasAssessment(user?.has_completed_assessment ?? false);
      }
      
      setIsChecking(false);
    };
    
    checkAuth();
  }, [requireAssessment]);

  if (isChecking) {
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

  if (requireAssessment && !hasAssessment) {
    return (
      <Navigate 
        to="/" 
        replace 
      />
    );
  }

  return <>{children}</>;
}
