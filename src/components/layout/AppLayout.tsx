import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSessionManager } from "@/hooks/useSessionManager";
import { SessionExpiryWarning } from "@/components/session/SessionExpiryWarning";
import { useRoutePersistence } from "@/hooks/useRoutePersistence";
import { ErrorBoundary } from "@/components/ErrorBoundary";

/**
 * Cleans up stale body locks (overflow:hidden, pointer-events:none)
 * left behind by Radix dialogs/sheets on EVERY route change.
 * Also runs a periodic check as a safety net for PWA resume scenarios.
 */
function useScrollLockCleanup() {
  const location = useLocation();

  // Clean up on every route change
  useEffect(() => {
    const body = document.body;
    if (body.style.overflow === "hidden") {
      body.style.overflow = "";
    }
    if (body.style.pointerEvents === "none") {
      body.style.pointerEvents = "";
    }
    // Also remove any Radix-injected data attributes that block interaction
    body.removeAttribute("data-scroll-locked");
  }, [location.pathname]);

  // Safety net: periodic check every 3s for stuck body locks
  // This catches edge cases like PWA resume where no route change fires
  useEffect(() => {
    const interval = setInterval(() => {
      const body = document.body;
      // Only clean if no open dialogs/sheets exist in the DOM
      const hasOpenOverlay = document.querySelector(
        "[data-state='open'][role='dialog'], [data-state='open'][role='alertdialog']"
      );
      if (!hasOpenOverlay) {
        if (body.style.overflow === "hidden") {
          body.style.overflow = "";
        }
        if (body.style.pointerEvents === "none") {
          body.style.pointerEvents = "";
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const { handleLogout, extendSession, showExpiryWarning, expiryCountdown } = useSessionManager();
  useRoutePersistence();
  useScrollLockCleanup();

  const doLogout = () => handleLogout("manual");

  // Close sidebar on EVERY route change (mobile) — not just when isMobile changes
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

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
