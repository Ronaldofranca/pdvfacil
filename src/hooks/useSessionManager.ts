import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { getDB } from "@/lib/offline/db";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"] as const;
const WARNING_BEFORE_MS = 2 * 60 * 1000; // Show warning 2 min before expiry
const DEFAULT_EXPIRATION_HOURS = 8;

async function logSecurityEvent(
  evento: string,
  empresaId?: string,
  userId?: string,
  detalhes?: Record<string, unknown>,
) {
  try {
    await supabase.from("security_logs").insert({
      evento,
      empresa_id: empresaId ?? null,
      usuario_id: userId ?? null,
      detalhes: detalhes ?? {},
      user_agent: navigator.userAgent,
    });
  } catch {
    // Security logging should never block UX
  }
}

async function clearAllCaches() {
  try {
    const qc = (window as any).__queryClient;
    qc?.clear?.();
  } catch {}

  // Clear IndexedDB cache store (keep device_id in meta)
  try {
    const db = await getDB();
    await db.clear("cache");
  } catch {}

  // Clear service worker caches
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {}
}

export function useSessionManager() {
  const { session, user, profile, signOut } = useAuth();
  const { data: config } = useConfiguracoes();
  const queryClient = useQueryClient();
  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef<number | null>(null);
  const logoutTimerRef = useRef<number | null>(null);
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [expiryCountdown, setExpiryCountdown] = useState(0);
  const countdownRef = useRef<number | null>(null);

  // Store queryClient globally for cache clearing
  useEffect(() => {
    (window as any).__queryClient = queryClient;
  }, [queryClient]);

  const expirationMs = ((config?.sessao_expiracao_horas as number) || DEFAULT_EXPIRATION_HOURS) * 60 * 60 * 1000;

  const handleLogout = useCallback(
    async (reason: "manual" | "inactivity" | "expired" | "global") => {
      // Clear timers
      if (warningTimerRef.current) window.clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) window.clearTimeout(logoutTimerRef.current);
      if (countdownRef.current) window.clearInterval(countdownRef.current);
      setShowExpiryWarning(false);

      // Log security event
      await logSecurityEvent("logout", profile?.empresa_id, user?.id, { reason });

      // Clear all caches
      await clearAllCaches();

      // Sign out (invalidates JWT refresh token server-side)
      await signOut();
    },
    [signOut, profile?.empresa_id, user?.id],
  );

  const resetTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowExpiryWarning(false);

    if (warningTimerRef.current) window.clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) window.clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) window.clearInterval(countdownRef.current);

    if (!session) return;

    const warningAt = Math.max(expirationMs - WARNING_BEFORE_MS, 0);

    warningTimerRef.current = window.setTimeout(() => {
      setShowExpiryWarning(true);
      setExpiryCountdown(Math.floor(WARNING_BEFORE_MS / 1000));

      countdownRef.current = window.setInterval(() => {
        setExpiryCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) window.clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningAt);

    logoutTimerRef.current = window.setTimeout(() => {
      handleLogout("inactivity");
    }, expirationMs);
  }, [session, expirationMs, handleLogout]);

  const extendSession = useCallback(() => {
    resetTimers();
    // Refresh the JWT token
    supabase.auth.refreshSession().catch(() => {});
  }, [resetTimers]);

  // Track user activity
  useEffect(() => {
    if (!session) return;

    const onActivity = () => {
      const now = Date.now();
      // Throttle: only reset if >30s since last reset
      if (now - lastActivityRef.current > 30_000) {
        resetTimers();
      }
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    // Initial timer setup
    resetTimers();

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      if (warningTimerRef.current) window.clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) window.clearTimeout(logoutTimerRef.current);
      if (countdownRef.current) window.clearInterval(countdownRef.current);
    };
  }, [session, resetTimers]);

  // Log sign-in events
  useEffect(() => {
    if (session && user && profile) {
      logSecurityEvent("login", profile.empresa_id, user.id, {
        method: "password",
      });
    }
  }, [session?.access_token]); // Only on new session

  return {
    handleLogout,
    extendSession,
    showExpiryWarning,
    expiryCountdown,
  };
}
