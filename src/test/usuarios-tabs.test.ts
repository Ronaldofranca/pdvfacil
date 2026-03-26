import { describe, it, expect } from "vitest";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  nome: string;
  email: string;
  cargo?: string;
  ativo: boolean;
  user_id?: string;
  empresa_id?: string;
  user_roles: { role: string }[];
}

interface ClientePortal {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  cidade?: string;
  ativo: boolean;
  user_id: string | null;
  has_portal_access: boolean;
}

// ─── Logic mirroring hooks and Usuarios.tsx ───────────────────────────────────

function filterAdmins(profiles: Profile[]): Profile[] {
  return profiles.filter((p) =>
    p.user_roles.some((r) => r.role === "admin" || r.role === "gerente")
  );
}

function filterVendedores(profiles: Profile[]): Profile[] {
  return profiles.filter((p) =>
    p.user_roles.some((r) => r.role === "vendedor")
  );
}

function mapClientesPortal(clientes: Omit<ClientePortal, "has_portal_access">[]): ClientePortal[] {
  return clientes.map((c) => ({ ...c, has_portal_access: !!c.user_id }));
}

function searchProfiles(profiles: Profile[], q: string): Profile[] {
  if (!q) return profiles;
  const lower = q.toLowerCase();
  return profiles.filter(
    (u) => u.nome.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower)
  );
}

function searchClientes(clientes: ClientePortal[], q: string): ClientePortal[] {
  if (!q) return clientes;
  const lower = q.toLowerCase();
  return clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(lower) ||
      c.email.toLowerCase().includes(lower) ||
      (c.telefone ?? "").includes(q)
  );
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockProfiles: Profile[] = [
  { id: "p1", nome: "Ronaldo Admin", email: "ronaldo@empresa.com", ativo: true, empresa_id: "e1", user_id: "u1", user_roles: [{ role: "admin" }] },
  { id: "p2", nome: "Maria Gerente", email: "maria@empresa.com", ativo: true, empresa_id: "e1", user_id: "u2", user_roles: [{ role: "gerente" }] },
  { id: "p3", nome: "João Vendedor", email: "joao@empresa.com", ativo: true, empresa_id: "e1", user_id: "u3", user_roles: [{ role: "vendedor" }] },
  { id: "p4", nome: "Ana Vendedora", email: "ana@empresa.com", ativo: false, empresa_id: "e1", user_id: "u4", user_roles: [{ role: "vendedor" }] },
];

const mockClientes: Omit<ClientePortal, "has_portal_access">[] = [
  { id: "c1", nome: "Elane Cliente", email: "elane@email.com", telefone: "11999990001", cidade: "SP", ativo: true, user_id: "u10" },
  { id: "c2", nome: "Samy Sem Portal", email: "samy@email.com", telefone: "11999990002", cidade: "RJ", ativo: true, user_id: null },
  { id: "c3", nome: "Nilza Inativa", email: "nilza@email.com", telefone: "11999990003", cidade: "MG", ativo: false, user_id: null },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Aba Administradores", () => {
  it("lista adminse gerentes, excluindo vendedores", () => {
    const result = filterAdmins(mockProfiles);
    expect(result.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("não inclui perfis sem role admin/gerente", () => {
    const result = filterAdmins(mockProfiles);
    expect(result.some((p) => p.user_roles.some((r) => r.role === "vendedor"))).toBe(false);
  });

  it("aparece mesmo quando o admin está inativo", () => {
    const inativeAdmin: Profile = { id: "p5", nome: "Inativo Admin", email: "x@y.com", ativo: false, user_roles: [{ role: "admin" }] };
    const result = filterAdmins([inativeAdmin]);
    expect(result).toHaveLength(1);
  });
});

describe("Aba Vendedores", () => {
  it("lista apenas perfis com role vendedor", () => {
    const result = filterVendedores(mockProfiles);
    expect(result.map((p) => p.id)).toEqual(["p3", "p4"]);
  });

  it("não inclui admins ou gerentes", () => {
    const result = filterVendedores(mockProfiles);
    expect(result.some((p) => p.user_roles.some((r) => r.role === "admin" || r.role === "gerente"))).toBe(false);
  });
});

describe("Aba Clientes", () => {
  it("lista TODOS os clientes da tabela clientes, independente de acesso ao portal", () => {
    const result = mapClientesPortal(mockClientes);
    expect(result).toHaveLength(3);
  });

  it("marca has_portal_access=true somente quando user_id está preenchido", () => {
    const result = mapClientesPortal(mockClientes);
    expect(result.find((c) => c.id === "c1")?.has_portal_access).toBe(true);
    expect(result.find((c) => c.id === "c2")?.has_portal_access).toBe(false);
    expect(result.find((c) => c.id === "c3")?.has_portal_access).toBe(false);
  });

  it("cliente de teste (Elane) aparece na aba Clientes mesmo sem acesso ao portal", () => {
    const samy: Omit<ClientePortal, "has_portal_access"> = {
      id: "c2", nome: "Samy Sem Portal", email: "samy@email.com", ativo: true, user_id: null,
    };
    const result = mapClientesPortal([samy]);
    expect(result).toHaveLength(1);
    expect(result[0].has_portal_access).toBe(false);
  });

  it("cliente inativo ainda aparece na listagem", () => {
    const result = mapClientesPortal(mockClientes);
    expect(result.find((c) => c.id === "c3")).toBeDefined();
  });
});

describe("Busca por aba", () => {
  const mapped = mapClientesPortal(mockClientes);

  it("busca por nome em profiles (case-insensitive)", () => {
    const result = searchProfiles(mockProfiles, "ronaldo");
    expect(result.map((p) => p.id)).toEqual(["p1"]);
  });

  it("busca por email em profiles", () => {
    const result = searchProfiles(mockProfiles, "@empresa.com");
    expect(result).toHaveLength(4);
  });

  it("busca por nome em clientes", () => {
    const result = searchClientes(mapped, "elane");
    expect(result.map((c) => c.id)).toEqual(["c1"]);
  });

  it("busca por telefone em clientes", () => {
    const result = searchClientes(mapped, "11999990002");
    expect(result.map((c) => c.id)).toEqual(["c2"]);
  });

  it("busca vazia retorna todos", () => {
    expect(searchProfiles(mockProfiles, "")).toHaveLength(4);
    expect(searchClientes(mapped, "")).toHaveLength(3);
  });

  it("busca sem resultado retorna array vazio", () => {
    const result = searchClientes(mapped, "xyz_inexistente");
    expect(result).toHaveLength(0);
  });
});

describe("Separação de fontes de dados", () => {
  it("Administradores e Vendedores vêm da tabela profiles", () => {
    // Simula que a tabela clientes não afeta as abas de sistema
    const admins = filterAdmins(mockProfiles);
    const vendedores = filterVendedores(mockProfiles);
    const clientes = mapClientesPortal(mockClientes);

    // Sem sobreposição de IDs entre as abas
    const adminIds = admins.map((p) => p.id);
    const vendedorIds = vendedores.map((p) => p.id);
    const clienteIds = clientes.map((c) => c.id);

    expect(adminIds.some((id) => vendedorIds.includes(id))).toBe(false);
    expect(adminIds.some((id) => clienteIds.includes(id))).toBe(false);
    expect(vendedorIds.some((id) => clienteIds.includes(id))).toBe(false);
  });
});
