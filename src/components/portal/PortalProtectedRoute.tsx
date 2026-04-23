import { Navigate } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";

export function PortalProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, isCliente } = usePortalAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session || !isCliente) {
    return <Navigate to="/portal/login" replace />;
  }

  return <>{children}</>;
}
