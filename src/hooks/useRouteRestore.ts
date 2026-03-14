import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getLastRoute } from "./useRoutePersistence";

/**
 * On first mount after login, navigates to the last saved route
 * if the user is currently at "/" (the default landing page).
 */
export function useRouteRestore() {
  const navigate = useNavigate();
  const location = useLocation();
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    // Only restore if landing on the default route
    if (location.pathname !== "/") return;

    const lastRoute = getLastRoute();
    if (lastRoute && lastRoute !== "/" && lastRoute !== "/login") {
      navigate(lastRoute, { replace: true });
    }
  }, []);
}
