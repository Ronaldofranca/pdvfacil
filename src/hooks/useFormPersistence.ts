import { useState, useEffect, useCallback, useRef } from "react";

const DEBOUNCE_MS = 500;

/**
 * Persists form state to localStorage with auto-save and auto-restore.
 * Call `clear()` after successful save or discard.
 */
export function useFormPersistence<T extends Record<string, any>>(
  key: string,
  defaultValues: T,
  enabled = true
): {
  data: T;
  setData: React.Dispatch<React.SetStateAction<T>>;
  setField: (field: keyof T, value: any) => void;
  clear: () => void;
  hasDraft: boolean;
} {
  const storageKey = `draft:${key}`;

  const [data, setData] = useState<T>(() => {
    if (!enabled) return defaultValues;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultValues, ...parsed };
      }
    } catch {}
    return defaultValues;
  });

  const [hasDraft, setHasDraft] = useState(() => {
    if (!enabled) return false;
    return localStorage.getItem(storageKey) !== null;
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced persist
  useEffect(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
        setHasDraft(true);
      } catch {}
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, storageKey, enabled]);

  const setField = useCallback((field: keyof T, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setHasDraft(false);
    setData(defaultValues);
  }, [storageKey, defaultValues]);

  return { data, setData, setField, clear, hasDraft };
}

/**
 * Persists PDV sale state (cart, client, payments, etc.)
 */
export function usePDVPersistence() {
  const STORAGE_KEY = "draft:pdv_sale";

  const save = useCallback((state: {
    cart: any[];
    clienteId: string;
    observacoes: string;
    pagamentos: any[];
    crediarioConfig: any;
    editingVendaId?: string;
    step?: string;
  }) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...state,
        savedAt: Date.now(),
      }));
    } catch {}
  }, []);

  const restore = useCallback((): {
    cart: any[];
    clienteId: string;
    observacoes: string;
    pagamentos: any[];
    crediarioConfig: any;
    editingVendaId?: string;
    step?: string;
  } | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      // Discard drafts older than 24h
      if (parsed.savedAt && Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const hasDraft = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return false;
      const parsed = JSON.parse(stored);
      return parsed.cart && parsed.cart.length > 0;
    } catch {
      return false;
    }
  }, []);

  return { save, restore, clear, hasDraft };
}
