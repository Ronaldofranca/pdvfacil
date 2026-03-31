/**
 * distribuirPagamento.ts
 *
 * Função pura para distribuir um valor recebido entre múltiplas parcelas.
 *
 * Regra de ordem: menor vencimento primeiro (mais antiga primeiro).
 * Uma parcela é quitada completamente antes de passar para a próxima.
 * Quando o valor restante é insuficiente para quitar a próxima,
 * aplica-se pagamento parcial nela.
 *
 * Não tem dependência de React, Supabase ou qualquer efeito colateral.
 * Totalmente testável de forma isolada.
 */

export interface ParcelaParaDistribuir {
  id: string;
  vencimento: string; // YYYY-MM-DD
  saldo: number;
  status: string;
}

export interface EntradaDistribuicao extends ParcelaParaDistribuir {
  /** Alias de `id` — usado no hook para montar o registro em `pagamentos`. */
  parcelaId: string;
  /** Valor que será aplicado nesta parcela (0 se não sobrou valor). */
  valorAplicado: number;
  /** Status previsto da parcela após o pagamento ser registrado. */
  statusApos: string;
}

export interface ResultadoDistribuicao {
  /** Lista de distribuições, uma por parcela passada (inclusive as com valorAplicado = 0). */
  entradas: EntradaDistribuicao[];
  /** Soma de todos os valorAplicado (≤ valorRecebido). */
  totalAplicado: number;
  /** Sobra não alocada: max(0, valorRecebido - totalAplicado). */
  sobra: number;
}

/**
 * Distribui `valorRecebido` entre `parcelas`, na ordem de vencimento crescente.
 *
 * @param parcelas  Array de parcelas a considerar (qualquer ordem).
 * @param valorRecebido  Valor total recebido a distribuir.
 * @returns `ResultadoDistribuicao` com a divisão por parcela, total aplicado e sobra.
 */
export function distribuirPagamento(
  parcelas: ParcelaParaDistribuir[],
  valorRecebido: number,
): ResultadoDistribuicao {
  // Ordena por vencimento ASC (string ISO YYYY-MM-DD — comparação lexicográfica é segura)
  const ordenadas = [...parcelas].sort((a, b) =>
    a.vencimento.localeCompare(b.vencimento),
  );

  // Trabalha com centavos para evitar erros de ponto flutuante
  let restanteCents = Math.round(valorRecebido * 100);

  const entradas: EntradaDistribuicao[] = ordenadas.map((p) => {
    const saldoCents = Math.round(p.saldo * 100);
    const aplicarCents = Math.min(restanteCents, saldoCents);
    restanteCents -= aplicarCents;

    const valorAplicado = aplicarCents / 100;

    // Determina o status resultante
    let statusApos = p.status;
    if (aplicarCents > 0 && aplicarCents >= saldoCents) {
      statusApos = "paga";
    } else if (aplicarCents > 0) {
      statusApos = "parcial";
    }
    // Se aplicarCents === 0, mantém o status original da parcela

    return {
      ...p,
      parcelaId: p.id,
      valorAplicado,
      statusApos,
    };
  });

  const totalAplicadoCents = entradas.reduce(
    (s, e) => s + Math.round(e.valorAplicado * 100),
    0,
  );
  const totalAplicado = totalAplicadoCents / 100;
  const sobra = Math.max(0, Math.round((valorRecebido * 100 - totalAplicadoCents)) / 100);

  return { entradas, totalAplicado, sobra };
}
