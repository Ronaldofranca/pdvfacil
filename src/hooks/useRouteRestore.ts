import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getLastRoute, clearLastRoute } from "./useRoutePersistence";

// Session-level flag stored in sessionStorage (cleared on tab close, survives HMR)
const SESSION_KEY = "app:route_restored";

function wasRestoredThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markRestoredThisSession(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {}
}

// Valid internal routes that can be restored
const VALID_ROUTE_PREFIXES = [
  "/vendas", "/clientes", "/produtos", "/estoque", "/financeiro",
  "/relatorios", "/pedidos", "/cobrancas", "/caixa", "/metas",
  "/alertas", "/configuracoes", "/usuarios", "/empresas",
  "/notificacoes", "/sync", "/backup", "/audit", "/mais",
  "/catalogo-interno", "/romaneio", "/importacao", "/conciliacao",
  "/mapa-clientes", "/previsao-estoque", "/agenda-entregas",
  "/documentacao",
];

function isValidRestoreRoute(route: string): boolean {
  if (route === "/") return false; // Don't restore root (it's the default)
  return VALID_ROUTE_PREFIXES.some((prefix) => route.startsWith(prefix));
}

/**
 * On first mount after login, navigates to the last saved route
 * if the user is currently at "/" (the default landing page).
 * Uses sessionStorage to prevent re-restore on HMR/remount.
 */
export function useRouteRestore() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (wasRestoredThisSession()) return;
    markRestoredThisSession();

    // Only restore if landing on the default route
    if (location.pathname !== "/") return;

    const lastRoute = getLastRoute();
    if (lastRoute && isValidRestoreRoute(lastRoute)) {
      clearLastRoute();
      try {
        navigate(lastRoute, { replace: true });
      } catch (err) {
        console.warn("[RouteRestore] Failed to restore route:", lastRoute, err);
        // Navigation failed — stay on current page, don't block
      }
    }
  }, []);
}
