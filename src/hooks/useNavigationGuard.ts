import { useEffect, useCallback } from "react";

/**
 * Warns the user before leaving the page when there are unsaved changes.
 * Uses the browser's beforeunload event for tab close / PWA background.
 * 
 * IMPORTANT: This ONLY blocks tab/window close, NOT in-app navigation.
 * It should never interfere with React Router navigation.
 */
export function useNavigationGuard(hasUnsavedChanges: boolean) {
  const handler = useCallback(
    (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      // Modern browsers ignore custom messages but still show a prompt
      e.returnValue = "Você possui alterações não salvas. Deseja sair?";
      return e.returnValue;
    },
    [hasUnsavedChanges]
  );

  useEffect(() => {
    if (hasUnsavedChanges) {
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
    }
  }, [hasUnsavedChanges, handler]);
}
