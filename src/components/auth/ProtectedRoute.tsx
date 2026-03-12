import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole, Permission } from "@/types/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
  requiredPermission?: Permission;
}

const AUTH_LOADING_TIMEOUT_MS = 12000;

export function ProtectedRoute({ children, requiredRole, requiredPermission }: ProtectedRouteProps) {
  const { session, loading, hasRole, hasPermission, signOut } = useAuth();
  const [authTimeout, setAuthTimeout] = useState(false);

  useEffect(() => {
    if (!loading) {
      setAuthTimeout(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setAuthTimeout(true);
    }, AUTH_LOADING_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [loading]);

  useEffect(() => {
    if (authTimeout && session) {
      void signOut();
    }
  }, [authTimeout, session, signOut]);

  if (loading && !authTimeout) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session || authTimeout) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
