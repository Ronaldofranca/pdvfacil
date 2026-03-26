import { describe, it, expect } from "vitest";

// ─── Interfaces & Mocks ─────────────────────────────────────────────────────

type Role = "admin" | "vendedor" | "cliente" | null;

interface Config {
  portal_mostrar_pedidos: boolean;
  portal_mostrar_parcelas: boolean;
  portal_mostrar_compras: boolean;
  portal_mostrar_pagamentos: boolean;
}

interface UserSession {
  id: string;
  role: Role;
  hasInternalProfile: boolean; // Simulates the presence of an entry in `profiles`
}

// ─── Routing Logic Simulators ───────────────────────────────────────────────

/**
 * Simulates React Router's <Navigate> or rendering behavior.
 * Returns the path the user ends up in, or "RENDERED" if they are allowed.
 */

// 1. ProtectedRoute (Admin pages guardian)
function adminProtectedRoute(session: UserSession | null, requiredRole?: Role): string {
  // Not logged in
  if (!session) return "/login";
  
  // They are logged in, but lack an internal profile (they are a Portal patient/cliente)
  if (!session.hasInternalProfile) {
    return "/portal";
  }

  // They have a profile, but maybe lack the specific role (e.g. for /usuarios which requires 'admin')
  if (requiredRole && session.role !== requiredRole) {
    return "/"; // redirect to dashboard
  }

  return "RENDERED";
}

// 2. Portal Protected Route (Portal pages guardian)
function portalProtectedRoute(session: UserSession | null): string {
  if (!session || session.role !== "cliente") {
    return "/portal/login";
  }
  return "RENDERED";
}

// 3. Portal Module Guard (Module pages Guardian - e.g. /portal/pedidos)
function portalModuleGuard(moduleIsActive: boolean): string {
  if (!moduleIsActive) {
    return "/portal"; // Redirect to portal home
  }
  return "RENDERED";
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Configuração de Acesso por Perfil e Seguranca de Rota", () => {
  
  const adminSession: UserSession = { id: "a1", role: "admin", hasInternalProfile: true };
  const vendedorSession: UserSession = { id: "v1", role: "vendedor", hasInternalProfile: true };
  const clienteSession: UserSession = { id: "c1", role: "cliente", hasInternalProfile: false };

  describe("Guardião Administrativo (ProtectedRoute)", () => {
    
    it("Admin acessa rota interna normal", () => {
      expect(adminProtectedRoute(adminSession)).toBe("RENDERED");
    });
    
    it("Vendedor acessa rota interna normal", () => {
      expect(adminProtectedRoute(vendedorSession)).toBe("RENDERED");
    });

    it("Vendedor NÃO acessa rota restrita a Admin (ex: Usuários)", () => {
      expect(adminProtectedRoute(vendedorSession, "admin")).toBe("/");
    });

    it("🔴 Cliente TENTA acessar rota interna administratva (ex: /estoque) - é expulsa para o /portal", () => {
      expect(adminProtectedRoute(clienteSession)).toBe("/portal");
    });

    it("Usuário não logado tenta acessar rota interna - é expulso para /login", () => {
      expect(adminProtectedRoute(null)).toBe("/login");
    });
  });

  describe("Guardião do Portal (PortalProtectedRoute)", () => {

    it("Cliente acessa o portal", () => {
      expect(portalProtectedRoute(clienteSession)).toBe("RENDERED");
    });

    it("Admin tentando acessar a URL interna do /portal como cliente falha", () => {
      // Admin might have to log out and log in as client, or the route kicks them to /portal/login
      expect(portalProtectedRoute(adminSession)).toBe("/portal/login");
    });
  });

  describe("Guardião de Módulos (Configurações Dinâmicas)", () => {

    const defaultConfig: Config = {
      portal_mostrar_pedidos: true,
      portal_mostrar_parcelas: true,
      portal_mostrar_compras: true,
      portal_mostrar_pagamentos: true,
    };

    it("Acessa módulo de Parcelas quando a configuração está LIGADA", () => {
      expect(portalModuleGuard(defaultConfig.portal_mostrar_parcelas)).toBe("RENDERED");
    });

    it("🔴 Cliente tenta acessar ROTA de Pedidos quando a master DESLIGOU na configuração", () => {
      const configRestrita = { ...defaultConfig, portal_mostrar_pedidos: false };
      expect(portalModuleGuard(configRestrita.portal_mostrar_pedidos)).toBe("/portal");
    });
    
    it("🔴 Cliente tenta acessar ROTA de Pagamentos quando a master DESLIGOU na configuração", () => {
      const configRestrita = { ...defaultConfig, portal_mostrar_pagamentos: false };
      expect(portalModuleGuard(configRestrita.portal_mostrar_pagamentos)).toBe("/portal");
    });

  });

});
