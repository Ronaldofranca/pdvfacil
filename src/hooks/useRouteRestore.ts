import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getLastRoute, clearLastRoute } from "./useRoutePersistence";

// Module-level flag: ensures restore only happens once per app session,
// not every time the Dashboard component remounts.
let restoredThisSession = false;

/**
 * On first mount after login, navigates to the last saved route
 * if the user is currently at "/" (the default landing page).
 */
export function useRouteRestore() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (restoredThisSession) return;
    restoredThisSession = true;

    // Only restore if landing on the default route
    if (location.pathname !== "/") return;

    const lastRoute = getLastRoute();
    if (lastRoute && lastRoute !== "/" && lastRoute !== "/login") {
      clearLastRoute();
      navigate(lastRoute, { replace: true });
    }
  }, []);
}
