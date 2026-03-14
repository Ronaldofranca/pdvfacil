import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ROUTE_KEY = "app:last_route";

// Routes that should NOT be restored (login, public pages)
const EXCLUDED_ROUTES = ["/login", "/catalogo", "/portal/login", "/aceitar-convite"];

/**
 * Persists the current route to localStorage on every navigation.
 * Call `getLastRoute()` on app init to restore.
 */
export function useRoutePersistence() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    if (!EXCLUDED_ROUTES.some((r) => path.startsWith(r))) {
      try {
        localStorage.setItem(ROUTE_KEY, path);
      } catch {}
    }
  }, [location.pathname]);
}

export function getLastRoute(): string | null {
  try {
    return localStorage.getItem(ROUTE_KEY);
  } catch {
    return null;
  }
}

export function clearLastRoute() {
  try {
    localStorage.removeItem(ROUTE_KEY);
  } catch {}
}
