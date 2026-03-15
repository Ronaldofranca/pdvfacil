import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getLastRoute, clearLastRoute } from "./useRoutePersistence";

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
  if (route === "/") return false;
  return VALID_ROUTE_PREFIXES.some((prefix) => route.startsWith(prefix));
}

/**
 * Restores the last visited route when the app lands on "/".
 * Works after tab kill, PWA resume, and page reload.
 * Placed in AppLayout so it runs once the user is authenticated.
 */
export function useRouteRestore() {
  const navigate = useNavigate();
  const location = useLocation();
  const restoredRef = useRef(false);

  useEffect(() => {
    // Only attempt restore once per mount and only when at root
    if (restoredRef.current) return;
    if (location.pathname !== "/") {
      restoredRef.current = true; // Already on a sub-page, no restore needed
      return;
    }

    restoredRef.current = true;

    const lastRoute = getLastRoute();
    if (lastRoute && isValidRestoreRoute(lastRoute)) {
      clearLastRoute();
      try {
        navigate(lastRoute, { replace: true });
      } catch (err) {
        console.warn("[RouteRestore] Failed to restore route:", lastRoute, err);
      }
    }
  }, []);
}
