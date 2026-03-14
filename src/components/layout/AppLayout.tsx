import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSessionManager } from "@/hooks/useSessionManager";
import { SessionExpiryWarning } from "@/components/session/SessionExpiryWarning";
import { useRoutePersistence } from "@/hooks/useRoutePersistence";
import { ErrorBoundary } from "@/components/ErrorBoundary";

/**
 * Ensures body scroll is never locked by stale modals/sheets on route change.
 */
function useScrollLockCleanup() {
  useEffect(() => {
    // On mount and when the component re-renders (route changes),
    // ensure body is scrollable. Radix/shadcn dialogs set overflow:hidden
    // and pointer-events:none on body which can get stuck.
    return () => {
      // Cleanup on unmount: remove any stale body locks
      const body = document.body;
      if (body.style.overflow === "hidden") {
        body.style.overflow = "";
      }
      if (body.style.pointerEvents === "none") {
        body.style.pointerEvents = "";
      }
    };
  }, []);
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const { handleLogout, extendSession, showExpiryWarning, expiryCountdown } = useSessionManager();
  useRoutePersistence();
  useScrollLockCleanup();

  const doLogout = () => handleLogout("manual");

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  return (
    <div className="flex h-dvh bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar open={true} onClose={() => {}} onLogout={doLogout} />
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setSidebarOpen(false)}
          />
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={doLogout} />
        </>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} onLogout={doLogout} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <ErrorBoundary fallbackRoute="/">
            <Outlet />
          </ErrorBoundary>
        </main>
        {isMobile && <BottomNav />}
      </div>

      {/* Session Expiry Warning */}
      <SessionExpiryWarning
        open={showExpiryWarning}
        countdown={expiryCountdown}
        onExtend={extendSession}
        onLogout={doLogout}
      />
    </div>
  );
}
