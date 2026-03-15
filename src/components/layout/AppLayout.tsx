import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSessionManager } from "@/hooks/useSessionManager";
import { SessionExpiryWarning } from "@/components/session/SessionExpiryWarning";
import { useRoutePersistence } from "@/hooks/useRoutePersistence";
import { useRouteRestore } from "@/hooks/useRouteRestore";
import { ErrorBoundary } from "@/components/ErrorBoundary";

/**
 * Removes stale body/scroll locks left by Radix dialogs, Vaul drawers, or sheets.
 * Only cleans when no open overlays exist in the DOM.
 */
function cleanBodyLocks() {
  const body = document.body;
  const hasOpenOverlay = document.querySelector(
    "[data-state='open'][role='dialog'], [data-state='open'][role='alertdialog'], [vaul-drawer][data-state='open']"
  );
  if (hasOpenOverlay) return;

  if (body.style.overflow === "hidden") body.style.overflow = "";
  if (body.style.pointerEvents === "none") body.style.pointerEvents = "";
  body.removeAttribute("data-scroll-locked");

  // Vaul drawer wrapper cleanup
  const wrapper = document.querySelector("[vaul-drawer-wrapper]") as HTMLElement | null;
  if (wrapper) {
    wrapper.style.transform = "";
    wrapper.style.transition = "";
  }
}

/**
 * Cleans up stale body locks on every route change, on visibility resume,
 * and periodically as a safety net.
 */
function useScrollLockCleanup() {
  const location = useLocation();

  // Clean on every route change (forced — no overlay check, since route changed)
  useEffect(() => {
    const body = document.body;
    body.style.overflow = "";
    body.style.pointerEvents = "";
    body.removeAttribute("data-scroll-locked");
  }, [location.pathname]);

  // Clean on visibilitychange (PWA resume from background)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        // Small delay to let Radix/Vaul finish their transitions
        setTimeout(cleanBodyLocks, 100);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Safety net: periodic check every 3s
  useEffect(() => {
    const interval = setInterval(cleanBodyLocks, 3000);
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

  // Close sidebar on EVERY route change (mobile)
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
