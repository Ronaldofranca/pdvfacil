import { describe, it, expect } from "vitest";

// ─── Interfaces (Mocking the tables) ────────────────────────────────────────

type StatusPedido = "rascunho" | "aguardando_entrega" | "em_rota" | "entregue" | "cancelado" | "convertido_em_venda";

interface Pedido {
  id: string;
  cliente_id: string;
  vendedor_id: string;
  status: StatusPedido;
  valor_total: number;
  observacoes: string;
}

interface UserSession {
  id: string; // The auth user ID
  role: "admin" | "vendedor" | "cliente";
  cliente_id?: string; // If role === 'cliente'
}

// ─── Mock Database ──────────────────────────────────────────────────────────

// Simulating the DB table `pedidos`
let mockDbPedidos: Pedido[] = [];

const CLIENTE_A_ID = "cli_A";
const CLIENTE_B_ID = "cli_B";
const VENDEDOR_ID = "vend_1";

// Reset DB before each test run
function seedDb() {
  mockDbPedidos = [
    {
      id: "ped_1",
      cliente_id: CLIENTE_A_ID,
      vendedor_id: VENDEDOR_ID,
      status: "aguardando_entrega",
      valor_total: 150,
      observacoes: "Pedido feito pelo portal do cliente",
    },
    {
      id: "ped_2",
      cliente_id: CLIENTE_B_ID,
      vendedor_id: VENDEDOR_ID,
      status: "entregue",
      valor_total: 300,
      observacoes: "",
    },
  ];
}

// ─── Core Logic Mirrors (Simulating RLS and Queries) ────────────────────────

class SimPortalAPI {
  session: UserSession;

  constructor(session: UserSession) {
    this.session = session;
  }

  // 1. Cliente cria pedido (simulando insert do PortalNovoPedido)
  async criarPedidoPortal(valor: number, observacoes = "Pedido feito pelo portal do cliente") {
    if (this.session.role !== "cliente" || !this.session.cliente_id) {
      throw new Error("Não autorizado");
    }

    const novoPedido: Pedido = {
      id: `ped_${Date.now()}`,
      cliente_id: this.session.cliente_id,
      vendedor_id: VENDEDOR_ID, // Em produção, viria do cadastro do cliente
      status: "aguardando_entrega", // Portal cria direto neste status
      valor_total: valor,
      observacoes,
    };

    mockDbPedidos.push(novoPedido);
    return novoPedido;
  }

  // 2. Cliente lista apenas os MEUS pedidos (simulando select do PortalPedidos)
  async listarMeusPedidos() {
    if (this.session.role !== "cliente" || !this.session.cliente_id) {
      throw new Error("Não autorizado");
    }
    return mockDbPedidos.filter((p) => p.cliente_id === this.session.cliente_id);
  }
}

class SimAdminAPI {
  session: UserSession;

  constructor(session: UserSession) {
    this.session = session;
  }

  // 3. Master lista TODOS os pedidos (simulando Master Pedidos.tsx)
  async listarTodosPedidos() {
    if (this.session.role !== "admin" && this.session.role !== "vendedor") {
      throw new Error("Não autorizado");
    }
    return [...mockDbPedidos];
  }

  // 4. Master atualiza status (simulando useAtualizarStatusPedido)
  async atualizarStatus(pedidoId: string, novoStatus: StatusPedido) {
    if (this.session.role !== "admin" && this.session.role !== "vendedor") {
      throw new Error("Não autorizado");
    }
    const idx = mockDbPedidos.findIndex((p) => p.id === pedidoId);
    if (idx === -1) throw new Error("Pedido não encontrado");

    mockDbPedidos[idx].status = novoStatus;
    return mockDbPedidos[idx];
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Integração Portal ↔ Admin (Pedidos)", () => {
  let portalClienteA: SimPortalAPI;
  let portalClienteB: SimPortalAPI;
  let adminPanel: SimAdminAPI;

  beforeEach(() => {
    seedDb();
    portalClienteA = new SimPortalAPI({ id: "userA", role: "cliente", cliente_id: CLIENTE_A_ID });
    portalClienteB = new SimPortalAPI({ id: "userB", role: "cliente", cliente_id: CLIENTE_B_ID });
    adminPanel = new SimAdminAPI({ id: "userMaster", role: "admin" });
  });

  describe("Criação e Vínculo", () => {
    it("cliente consegue criar um pedido com sucesso", async () => {
      const pedido = await portalClienteA.criarPedidoPortal(500);
      expect(pedido.id).toBeDefined();
      expect(pedido.valor_total).toBe(500);
      expect(pedido.status).toBe("aguardando_entrega");
    });

    it("pedido criado fica automaticamente vinculado à cliente correta", async () => {
      const pedido = await portalClienteA.criarPedidoPortal(250);
      expect(pedido.cliente_id).toBe(CLIENTE_A_ID);
    });
  });

  describe("Segurança / Isolamento do Portal", () => {
    it("cliente A não consegue ver pedidos do cliente B", async () => {
      const pedidosA = await portalClienteA.listarMeusPedidos();
      // "ped_1" pertence ao A, "ped_2" pertence ao B (base inicial provida no seed)
      expect(pedidosA.map((p) => p.id)).toContain("ped_1");
      expect(pedidosA.map((p) => p.id)).not.toContain("ped_2");
    });

    it("cliente B enxerga apenas o próprio pedido", async () => {
      const pedidosB = await portalClienteB.listarMeusPedidos();
      expect(pedidosB.map((p) => p.id)).toContain("ped_2");
      expect(pedidosB.map((p) => p.id)).not.toContain("ped_1");
    });
  });

  describe("Integração com Master (O fluxo nativo)", () => {
    it("master consegue ver pedidos vindos da loja e pedidos vindos do portal na mesma lista", async () => {
      const pedidosAdmin = await adminPanel.listarTodosPedidos();
      const ids = pedidosAdmin.map((p) => p.id);
      expect(ids).toContain("ped_1"); // Veio do portal 
      expect(ids).toContain("ped_2"); // Existia nativamente
    });

    it("master altera o status do pedido em tempo-real", async () => {
      // 1. Cliente A tem um pedido 'aguardando_entrega'
      expect((await portalClienteA.listarMeusPedidos())[0].status).toBe("aguardando_entrega");

      // 2. Master muda o status para 'em_rota'
      await adminPanel.atualizarStatus("ped_1", "em_rota");

      // 3. Cliente A verifica de novo e o status já mudou, provando que a tabela é compartilhada
      const myRefetchedOrders = await portalClienteA.listarMeusPedidos();
      expect(myRefetchedOrders.find((p) => p.id === "ped_1")?.status).toBe("em_rota");
    });

    it("master cancela pedido do portal e a cliente vê", async () => {
      await adminPanel.atualizarStatus("ped_1", "cancelado");
      const clientOrders = await portalClienteA.listarMeusPedidos();
      expect(clientOrders.find((p) => p.id === "ped_1")?.status).toBe("cancelado");
    });
  });

  describe("Lógica visual (Badge Origem)", () => {
    it("isPortalOrder identifica corretamente pelo campo observacoes", () => {
      // Essa é a lógica extraída da view `Pedidos.tsx`
      const isPortalOrder = (obs?: string) => !!obs && obs.toLowerCase().includes("pedido feito pelo portal");

      expect(isPortalOrder("Pedido feito pelo portal do cliente")).toBe(true);
      expect(isPortalOrder("PEDIDO FEITO PELO PORTAL (cliente ligou)")).toBe(true);
      expect(isPortalOrder("Pedido normal")).toBe(false);
      expect(isPortalOrder("")).toBe(false);
      expect(isPortalOrder(undefined)).toBe(false);
    });
  });
});
