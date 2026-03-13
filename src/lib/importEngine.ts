import { supabase } from "@/integrations/supabase/client";
import { normalizeTelefone } from "@/lib/cepUtils";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// ─── File parsing ───
export function parseFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const wb = XLSX.read(text, { type: "string" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
          resolve(rows);
        } catch (err) {
          reject(new Error("Erro ao ler arquivo CSV"));
        }
      };
      reader.readAsText(file, "UTF-8");
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
          resolve(rows);
        } catch (err) {
          reject(new Error("Erro ao ler arquivo Excel"));
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error("Formato inválido. Use CSV ou XLSX."));
    }
  });
}

// ─── Types ───
export type ImportType = "clientes" | "produtos" | "estoque" | "parcelas";
export type ImportMode = "create_only" | "create_update" | "skip_duplicates";

export interface ColumnMapping {
  [sheetColumn: string]: string; // maps sheet column → system field
}

export interface ImportValidationResult {
  valid: ImportRowResult[];
  errors: ImportRowResult[];
  duplicates: ImportRowResult[];
  totalRows: number;
}

export interface ImportRowResult {
  rowIndex: number;
  data: Record<string, string>;
  error?: string;
  isDuplicate?: boolean;
  existingId?: string;
}

export interface ImportExecutionResult {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; error: string }[];
}

// ─── System fields per type ───
export const SYSTEM_FIELDS: Record<ImportType, { key: string; label: string; required?: boolean }[]> = {
  clientes: [
    { key: "nome", label: "Nome", required: true },
    { key: "telefone_principal", label: "Telefone Principal" },
    { key: "telefone_secundario", label: "Telefone Secundário" },
    { key: "email", label: "E-mail" },
    { key: "cpf_cnpj", label: "CPF/CNPJ" },
    { key: "cep", label: "CEP" },
    { key: "rua", label: "Rua" },
    { key: "bairro", label: "Bairro" },
    { key: "cidade", label: "Cidade" },
    { key: "uf", label: "UF" },
    { key: "observacoes", label: "Observações" },
  ],
  produtos: [
    { key: "nome", label: "Nome", required: true },
    { key: "codigo", label: "Código" },
    { key: "categoria", label: "Categoria" },
    { key: "descricao", label: "Descrição" },
    { key: "custo", label: "Custo" },
    { key: "preco", label: "Preço" },
    { key: "unidade", label: "Unidade" },
  ],
  estoque: [
    { key: "produto_codigo", label: "Código do Produto" },
    { key: "produto_nome", label: "Nome do Produto" },
    { key: "quantidade", label: "Quantidade", required: true },
    { key: "observacao", label: "Observação" },
  ],
  parcelas: [
    { key: "cliente", label: "Nome do Cliente" },
    { key: "telefone", label: "Telefone do Cliente" },
    { key: "valor_parcela", label: "Valor da Parcela", required: true },
    { key: "valor_pago", label: "Valor Pago" },
    { key: "data_vencimento", label: "Data de Vencimento", required: true },
    { key: "status", label: "Status" },
    { key: "descricao", label: "Descrição" },
    { key: "numero_parcela", label: "Nº da Parcela" },
  ],
};

// ─── Auto-mapping heuristic ───
export function autoMapColumns(sheetColumns: string[], importType: ImportType): ColumnMapping {
  const mapping: ColumnMapping = {};
  const fields = SYSTEM_FIELDS[importType];
  const normalizeLabel = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

  const aliases: Record<string, string[]> = {
    nome: ["nome", "name", "cliente", "razao", "razaosocial"],
    telefone_principal: ["telefone", "telefone1", "fone", "celular", "tel", "whatsapp", "telefoneprincipal"],
    telefone_secundario: ["telefone2", "fone2", "celular2", "telefonesecundario"],
    email: ["email", "mail", "emailcliente"],
    cpf_cnpj: ["cpf", "cnpj", "cpfcnpj", "documento"],
    cep: ["cep"],
    rua: ["rua", "logradouro", "endereco", "end"],
    bairro: ["bairro"],
    cidade: ["cidade", "municipio"],
    uf: ["uf", "estado"],
    observacoes: ["observacoes", "obs", "observacao", "notas"],
    codigo: ["codigo", "cod", "code", "sku", "barcode", "codigobarra"],
    categoria: ["categoria", "cat", "grupo"],
    descricao: ["descricao", "desc", "description"],
    custo: ["custo", "custounit", "precochega"],
    preco: ["preco", "precovenda", "valor", "price"],
    unidade: ["unidade", "un", "unit"],
    produto_codigo: ["codigoproduto", "codproduto", "codigo", "cod", "sku"],
    produto_nome: ["nomeproduto", "produto", "nome"],
    quantidade: ["quantidade", "qtd", "qtde", "qty"],
    observacao: ["observacao", "obs"],
    cliente: ["cliente", "nomecliente", "nome"],
    telefone: ["telefone", "fone", "celular", "tel"],
    valor_parcela: ["valorparcela", "valor", "vlrparcela"],
    valor_pago: ["valorpago", "pago", "vlrpago"],
    data_vencimento: ["datavencimento", "vencimento", "venc"],
    status: ["status", "situacao"],
    numero_parcela: ["numeroparcela", "numparcela", "numero", "parcela"],
  };

  for (const col of sheetColumns) {
    const norm = normalizeLabel(col);
    for (const field of fields) {
      const fieldAliases = aliases[field.key] || [normalizeLabel(field.label)];
      if (fieldAliases.includes(norm) && !Object.values(mapping).includes(field.key)) {
        mapping[col] = field.key;
        break;
      }
    }
  }
  return mapping;
}

// ─── Validation ───
export async function validateImport(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  importType: ImportType,
  empresaId: string,
  mode: ImportMode
): Promise<ImportValidationResult> {
  const result: ImportValidationResult = { valid: [], errors: [], duplicates: [], totalRows: rows.length };
  const fields = SYSTEM_FIELDS[importType];
  const requiredFields = fields.filter(f => f.required).map(f => f.key);
  const reversedMapping: Record<string, string> = {};
  for (const [sheetCol, sysField] of Object.entries(mapping)) {
    reversedMapping[sysField] = sheetCol;
  }

  // Fetch existing data for duplicate detection
  let existingClients: any[] = [];
  let existingProducts: any[] = [];
  if (importType === "clientes") {
    const { data } = await (supabase as any).from("cliente_telefones").select("telefone_normalizado, cliente_id, clientes(nome)").eq("empresa_id", empresaId);
    existingClients = data || [];
  } else if (importType === "produtos") {
    const { data } = await supabase.from("produtos").select("id, codigo, nome").eq("empresa_id", empresaId);
    existingProducts = data || [];
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const mapped: Record<string, string> = {};
    for (const [sheetCol, sysField] of Object.entries(mapping)) {
      mapped[sysField] = String(row[sheetCol] ?? "").trim();
    }

    // Check required fields
    const missingReq = requiredFields.filter(f => !mapped[f]);
    if (missingReq.length > 0) {
      result.errors.push({ rowIndex: i + 2, data: mapped, error: `Campo(s) obrigatório(s) vazio(s): ${missingReq.join(", ")}` });
      continue;
    }

    // Type-specific validations
    let isDuplicate = false;
    let existingId: string | undefined;

    if (importType === "clientes") {
      const tel = normalizeTelefone(mapped.telefone_principal || "");
      if (tel) {
        const dup = existingClients.find((c: any) => c.telefone_normalizado === tel);
        if (dup) { isDuplicate = true; existingId = dup.cliente_id; }
      }
    } else if (importType === "produtos") {
      if (mapped.codigo) {
        const dup = existingProducts.find(p => p.codigo === mapped.codigo);
        if (dup) { isDuplicate = true; existingId = dup.id; }
      }
    } else if (importType === "parcelas") {
      const v = parseFloat(mapped.valor_parcela);
      if (isNaN(v) || v <= 0) {
        result.errors.push({ rowIndex: i + 2, data: mapped, error: "Valor da parcela inválido" });
        continue;
      }
      if (!mapped.data_vencimento) {
        result.errors.push({ rowIndex: i + 2, data: mapped, error: "Data de vencimento obrigatória" });
        continue;
      }
    } else if (importType === "estoque") {
      const q = parseFloat(mapped.quantidade);
      if (isNaN(q) || q <= 0) {
        result.errors.push({ rowIndex: i + 2, data: mapped, error: "Quantidade inválida" });
        continue;
      }
    }

    const entry: ImportRowResult = { rowIndex: i + 2, data: mapped, isDuplicate, existingId };
    if (isDuplicate) {
      result.duplicates.push(entry);
      if (mode === "create_update") result.valid.push(entry);
      else if (mode === "skip_duplicates") { /* skip */ }
      else result.errors.push({ ...entry, error: "Registro duplicado" });
    } else {
      result.valid.push(entry);
    }
  }
  return result;
}

// ─── Execution ───
export async function executeImport(
  validRows: ImportRowResult[],
  importType: ImportType,
  empresaId: string,
  userId: string,
  mode: ImportMode,
  onProgress?: (current: number, total: number) => void
): Promise<ImportExecutionResult> {
  const result: ImportExecutionResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < validRows.length; i++) {
    onProgress?.(i + 1, validRows.length);
    const row = validRows[i];
    const d = row.data;
    try {
      if (importType === "clientes") {
        await importCliente(d, empresaId, row.isDuplicate, row.existingId, mode, result);
      } else if (importType === "produtos") {
        await importProduto(d, empresaId, row.isDuplicate, row.existingId, mode, result);
      } else if (importType === "estoque") {
        await importEstoque(d, empresaId, userId, result);
      } else if (importType === "parcelas") {
        await importParcela(d, empresaId, result);
      }
    } catch (err: any) {
      result.errors.push({ row: row.rowIndex, error: err.message || "Erro desconhecido" });
    }
  }

  // Audit log
  try {
    await (supabase as any).from("audit_logs").insert({
      empresa_id: empresaId,
      usuario_id: userId,
      acao: "IMPORT",
      tabela: importType,
      registro_id: null,
      dados_novos: { tipo: importType, criados: result.created, atualizados: result.updated, erros: result.errors.length },
    });
  } catch { /* best effort */ }

  return result;
}

async function importCliente(d: Record<string, string>, empresaId: string, isDuplicate?: boolean, existingId?: string, mode?: ImportMode, result?: ImportExecutionResult) {
  const payload: Record<string, any> = {
    nome: d.nome,
    email: d.email || "",
    cpf_cnpj: d.cpf_cnpj || "",
    cep: d.cep || "",
    rua: d.rua || "",
    bairro: d.bairro || "",
    cidade: d.cidade || "",
    estado: (d.uf || "").toUpperCase(),
    uf: (d.uf || "").toUpperCase(),
    observacoes: d.observacoes || "",
    telefone: d.telefone_principal || "",
    updated_at: new Date().toISOString(),
  };

  let clienteId: string;
  if (isDuplicate && existingId && mode === "create_update") {
    await supabase.from("clientes").update(payload).eq("id", existingId);
    clienteId = existingId;
    result!.updated++;
  } else {
    const { data, error } = await (supabase as any).from("clientes").insert({ ...payload, empresa_id: empresaId }).select("id").single();
    if (error) throw error;
    clienteId = data.id;
    result!.created++;
  }

  // Add phones to cliente_telefones
  const phones: { telefone: string; tipo: string; principal: boolean }[] = [];
  if (d.telefone_principal) phones.push({ telefone: normalizeTelefone(d.telefone_principal), tipo: "celular", principal: true });
  if (d.telefone_secundario) phones.push({ telefone: normalizeTelefone(d.telefone_secundario), tipo: "celular", principal: false });

  for (const phone of phones) {
    if (!phone.telefone) continue;
    try {
      await (supabase as any).from("cliente_telefones").insert({
        empresa_id: empresaId,
        cliente_id: clienteId,
        telefone: phone.telefone,
        telefone_normalizado: phone.telefone,
        tipo: phone.tipo,
        principal: phone.principal,
      });
    } catch { /* phone might already exist, skip */ }
  }
}

async function importProduto(d: Record<string, string>, empresaId: string, isDuplicate?: boolean, existingId?: string, mode?: ImportMode, result?: ImportExecutionResult) {
  let categoriaId: string | null = null;
  if (d.categoria) {
    const { data: existing } = await supabase.from("categorias").select("id").eq("empresa_id", empresaId).eq("nome", d.categoria).maybeSingle();
    if (existing) {
      categoriaId = existing.id;
    } else {
      const { data: created } = await supabase.from("categorias").insert({ empresa_id: empresaId, nome: d.categoria }).select("id").single();
      if (created) categoriaId = created.id;
    }
  }

  const payload: Record<string, any> = {
    nome: d.nome,
    codigo: d.codigo || "",
    descricao: d.descricao || "",
    categoria_id: categoriaId,
    custo: parseFloat(d.custo) || 0,
    preco: parseFloat(d.preco) || 0,
    unidade: d.unidade || "un",
    updated_at: new Date().toISOString(),
  };

  if (isDuplicate && existingId && mode === "create_update") {
    await supabase.from("produtos").update(payload).eq("id", existingId);
    result!.updated++;
  } else {
    const { error } = await supabase.from("produtos").insert({ ...payload, empresa_id: empresaId });
    if (error) throw error;
    result!.created++;
  }
}

async function importEstoque(d: Record<string, string>, empresaId: string, userId: string, result?: ImportExecutionResult) {
  // Find product by codigo or nome
  let productId: string | null = null;
  if (d.produto_codigo) {
    const { data } = await supabase.from("produtos").select("id").eq("empresa_id", empresaId).eq("codigo", d.produto_codigo).maybeSingle();
    if (data) productId = data.id;
  }
  if (!productId && d.produto_nome) {
    const { data } = await supabase.from("produtos").select("id").eq("empresa_id", empresaId).ilike("nome", d.produto_nome).maybeSingle();
    if (data) productId = data.id;
  }
  if (!productId) throw new Error(`Produto não encontrado: ${d.produto_codigo || d.produto_nome}`);

  const qty = parseFloat(d.quantidade);
  if (isNaN(qty) || qty <= 0) throw new Error("Quantidade inválida");

  // Create stock movement (trigger will update estoque table)
  const { error } = await supabase.from("movimentos_estoque").insert({
    empresa_id: empresaId,
    produto_id: productId,
    vendedor_id: userId,
    tipo: "reposicao" as any,
    quantidade: qty,
    observacoes: d.observacao || "Importação em massa",
  });
  if (error) throw error;
  result!.created++;
}

async function importParcela(d: Record<string, string>, empresaId: string, result?: ImportExecutionResult) {
  // Find or create client
  let clienteId: string | null = null;
  if (d.cliente || d.telefone) {
    if (d.telefone) {
      const norm = normalizeTelefone(d.telefone);
      if (norm) {
        const { data } = await (supabase as any).from("cliente_telefones").select("cliente_id").eq("empresa_id", empresaId).eq("telefone_normalizado", norm).maybeSingle();
        if (data) clienteId = data.cliente_id;
      }
    }
    if (!clienteId && d.cliente) {
      const { data } = await supabase.from("clientes").select("id").eq("empresa_id", empresaId).ilike("nome", d.cliente).maybeSingle();
      if (data) clienteId = data.id;
    }
    // Create client if not found
    if (!clienteId && d.cliente) {
      const { data: newClient } = await (supabase as any).from("clientes").insert({
        empresa_id: empresaId,
        nome: d.cliente,
        telefone: d.telefone ? normalizeTelefone(d.telefone) : "",
      }).select("id").single();
      if (newClient) {
        clienteId = newClient.id;
        if (d.telefone) {
          try {
            await (supabase as any).from("cliente_telefones").insert({
              empresa_id: empresaId, cliente_id: clienteId,
              telefone: normalizeTelefone(d.telefone), telefone_normalizado: normalizeTelefone(d.telefone),
              tipo: "celular", principal: true,
            });
          } catch { /* skip */ }
        }
      }
    }
  }

  // Parse date
  let vencimento = d.data_vencimento;
  // Handle DD/MM/YYYY format
  if (vencimento && vencimento.includes("/")) {
    const parts = vencimento.split("/");
    if (parts.length === 3) {
      vencimento = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }

  const valorTotal = parseFloat(d.valor_parcela) || 0;
  const valorPago = parseFloat(d.valor_pago) || 0;

  const { error } = await supabase.from("parcelas").insert({
    empresa_id: empresaId,
    cliente_id: clienteId,
    venda_id: null,
    numero: parseInt(d.numero_parcela) || 1,
    valor_total: valorTotal,
    valor_pago: valorPago,
    vencimento,
    observacoes: d.descricao || "Importação em massa",
    forma_pagamento: "",
  });
  if (error) throw error;
  result!.created++;
}

// ─── Template download ───
export function downloadTemplate(type: ImportType) {
  const fields = SYSTEM_FIELDS[type];
  const headers = fields.map(f => f.label);
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Modelo");
  XLSX.writeFile(wb, `modelo_${type}.csv`);
}
