import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * A drop-in replacement for useState that persists the state in localStorage.
 * State is scoped to the current user and the provided key.
 * 
 * @param key Unique key for the state (e.g., 'vendas_search')
 * @param defaultValue Default value if no state is persisted
 * @param scope Optional scope/view name to group states
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  scope: string = "global"
): [T, (value: T | ((curr: T) => T)) => void, () => void] {
  const { user } = useAuth();
  const userId = user?.id || "guest";
  const storageKey = `@pdvfacil:state:${userId}:${scope}:${key}`;

  // Helper to parse dates correctly from JSON
  const dateReviver = (_key: string, value: any) => {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
    if (typeof value === "string" && isoDateRegex.test(value)) {
      return new Date(value);
    }
    return value;
  };

  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        return JSON.parse(saved, dateReviver);
      }
    } catch (e) {
      console.error(`Error restoring persistent state for ${key}:`, e);
    }
    return defaultValue;
  });

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      console.error(`Error saving persistent state for ${key}:`, e);
    }
  }, [state, storageKey]);

  const clear = () => {
    try {
      localStorage.removeItem(storageKey);
      setState(defaultValue);
    } catch (e) {
      console.error(`Error clearing persistent state for ${key}:`, e);
    }
  };

  return [state, setState, clear];
}
