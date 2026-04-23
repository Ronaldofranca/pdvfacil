import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { PortalAuthProvider, usePortalAuth } from "../PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";

// Mock do supabase e hooks necessários
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
        })),
      })),
    })),
    rpc: vi.fn(),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PortalAuthProvider>{children}</PortalAuthProvider>
);

describe("PortalAuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deve carregar a sessão com sucesso", async () => {
    const mockSession = { user: { id: "123" } };
    (supabase.auth.getSession as any).mockResolvedValueOnce({ data: { session: mockSession }, error: null });
    
    const selectEqMock = vi.fn().mockResolvedValue({ data: [{ role: "cliente" }] });
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: selectEqMock,
      }),
    });

    const { result } = renderHook(() => usePortalAuth(), { wrapper });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      // Resolve as promessas no context
      await vi.runAllTimersAsync();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.session).toBe(mockSession);
    expect(result.current.isCliente).toBe(true);
  });

  it("deve limpar cache e localStorage quando session sofrer timeout extremo (deadlock)", async () => {
    localStorage.setItem("sb-teste-auth-token", "fake-stale-token");
    localStorage.setItem("outra-coisa", "manter");

    // Fica eternamente em pending para forçar timeout de 7s
    (supabase.auth.getSession as any).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePortalAuth(), { wrapper });

    expect(result.current.loading).toBe(true);

    // Avança 7 segundos para acionar o safety timeout (break lock)
    await act(async () => {
      vi.advanceTimersByTime(7000);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.session).toBeNull();
    // A chave de auth deveria ser apagada para quebrar o deadlock!
    expect(localStorage.getItem("sb-teste-auth-token")).toBeNull();
    // Chaves que não são do auth devem persistir
    expect(localStorage.getItem("outra-coisa")).toBe("manter");
  });

  it("deve tratar erro ao recuperar sessão e limpar cache", async () => {
    localStorage.setItem("sb-teste-auth-token", "corrupt-token");

    // Simula erro assíncrono ao pegar a sessão (ex: JWT malformado / rede falha)
    (supabase.auth.getSession as any).mockResolvedValueOnce({ data: { session: null }, error: new Error("JWT error") });

    const { result } = renderHook(() => usePortalAuth(), { wrapper });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.session).toBeNull();
    expect(localStorage.getItem("sb-teste-auth-token")).toBeNull(); // Tem que ter esvaziado o lock
  });
});
