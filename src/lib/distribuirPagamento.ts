/**
 * Módulo de distribuição automática de pagamento entre parcelas.
 *
 * Regra adotada: menor vencimento primeiro (ASC).
 * - Quita completamente uma parcela antes de avançar para a próxima.
 * - Se o saldo restante não quitar a próxima, aplica pagamento parcial.
 * - Nunca aplica valor negativo ou além do saldo da parcela.
 */

export interface ParcelaParaDistribuir {
  id: string;
  vencimento: string; // YYYY-MM-DD
  saldo: number;      // valor ainda em aberto
  status: string;
}

export interface EntradaDistribuicao {
  id: string;
  parcelaId: string;
  vencimento: string;
  saldo: number;
  statusAtual: string;
  /** Valor que será aplicado nesta parcela. 0 = não tocada. */
  valorAplicado: number;
  /** Status após o pagamento. */
  statusApos: "paga" | "parcial" | string;
}

export interface ResultadoDistribuicao {
  entradas: EntradaDistribuicao[];
  totalAplicado: number;
  sobra: number;      // valorRecebido - totalAplicado (> 0 = excesso)
}

/**
 * Distribui `valorRecebido` entre as `parcelas` fornecidas, na ordem
 * de menor vencimento primeiro.
 *
 * @param parcelas  Lista de parcelas a considerar (qualquer ordem; serão ordenadas).
 * @param valorRecebido  Valor total recebido pelo pagador.
 */
export function distribuirPagamento(
  parcelas: ParcelaParaDistribuir[],
  valorRecebido: number
): ResultadoDistribuicao {
  // Ordenar por vencimento ASC
  const ordenadas = [...parcelas].sort((a, b) =>
    a.vencimento.localeCompare(b.vencimento)
  );

  let restante = Math.round(valorRecebido * 100) / 100;
  const entradas: EntradaDistribuicao[] = [];

  for (const parcela of ordenadas) {
    const saldo = Math.round(Number(parcela.saldo) * 100) / 100;

    if (restante <= 0 || saldo <= 0) {
      entradas.push({
        id: parcela.id,
        parcelaId: parcela.id,
        vencimento: parcela.vencimento,
        saldo,
        statusAtual: parcela.status,
        valorAplicado: 0,
        statusApos: parcela.status,
      });
      continue;
    }

    const aplicado = Math.min(restante, saldo);
    const novoSaldo = Math.round((saldo - aplicado) * 100) / 100;
    const statusApos: EntradaDistribuicao["statusApos"] =
      novoSaldo === 0 ? "paga" : "parcial";

    entradas.push({
      id: parcela.id,
      parcelaId: parcela.id,
      vencimento: parcela.vencimento,
      saldo,
      statusAtual: parcela.status,
      valorAplicado: Math.round(aplicado * 100) / 100,
      statusApos,
    });

    restante = Math.round((restante - aplicado) * 100) / 100;
  }

  const totalAplicado = Math.round(
    entradas.reduce((s, e) => s + e.valorAplicado, 0) * 100
  ) / 100;
  const sobra = Math.max(0, Math.round((valorRecebido - totalAplicado) * 100) / 100);

  return { entradas, totalAplicado, sobra };
}
