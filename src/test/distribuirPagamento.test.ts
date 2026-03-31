import { describe, it, expect } from 'vitest';
import { distribuirPagamento, type ParcelaParaDistribuir } from '../lib/distribuirPagamento';

// ── Helpers ──────────────────────────────────────────────────────────────────

const parcela = (
  id: string,
  vencimento: string,
  saldo: number,
  status = 'pendente'
): ParcelaParaDistribuir => ({ id, vencimento, saldo, status });

const p1 = parcela('p1', '2026-01-10', 210); // mais antiga
const p2 = parcela('p2', '2026-02-10', 210);
const p3 = parcela('p3', '2026-03-10', 210); // mais nova

// ── Testes ────────────────────────────────────────────────────────────────────

describe('distribuirPagamento — exemplo real do usuário', () => {
  it('deve quitar p1 e dar baixa parcial de R$90 em p2 com R$300', () => {
    const { entradas, totalAplicado, sobra } = distribuirPagamento([p1, p2, p3], 300);

    expect(totalAplicado).toBe(300);
    expect(sobra).toBe(0);

    const e1 = entradas.find((e) => e.id === 'p1')!;
    expect(e1.valorAplicado).toBe(210);
    expect(e1.statusApos).toBe('paga');

    const e2 = entradas.find((e) => e.id === 'p2')!;
    expect(e2.valorAplicado).toBe(90);
    expect(e2.statusApos).toBe('parcial');

    const e3 = entradas.find((e) => e.id === 'p3')!;
    expect(e3.valorAplicado).toBe(0);
    expect(e3.statusApos).toBe('pendente'); // inalterada
  });
});

describe('distribuirPagamento — ordem de distribuição', () => {
  it('deve processar a de menor vencimento primeiro mesmo se passada fora de ordem', () => {
    // Passamos em ordem inversa: p3, p2, p1
    const { entradas } = distribuirPagamento([p3, p2, p1], 210);

    const e1 = entradas.find((e) => e.id === 'p1')!;
    expect(e1.valorAplicado).toBe(210); // p1 é a mais antiga → recebe primeiro
    expect(e1.statusApos).toBe('paga');

    const e2 = entradas.find((e) => e.id === 'p2')!;
    expect(e2.valorAplicado).toBe(0); // não sobrou nada

    const e3 = entradas.find((e) => e.id === 'p3')!;
    expect(e3.valorAplicado).toBe(0);
  });
});

describe('distribuirPagamento — valor exato', () => {
  it('deve quitar todas as parcelas quando o valor iguala o saldo total', () => {
    const { entradas, totalAplicado, sobra } = distribuirPagamento([p1, p2, p3], 630);

    expect(totalAplicado).toBe(630);
    expect(sobra).toBe(0);
    entradas.forEach((e) => {
      expect(e.valorAplicado).toBe(210);
      expect(e.statusApos).toBe('paga');
    });
  });
});

describe('distribuirPagamento — pagamento parcial na primeira parcela', () => {
  it('deve gerar status "parcial" quando o valor é menor que o saldo da primeira parcela', () => {
    const { entradas, totalAplicado } = distribuirPagamento([p1, p2, p3], 100);

    expect(totalAplicado).toBe(100);

    const e1 = entradas.find((e) => e.id === 'p1')!;
    expect(e1.valorAplicado).toBe(100);
    expect(e1.statusApos).toBe('parcial');

    const e2 = entradas.find((e) => e.id === 'p2')!;
    expect(e2.valorAplicado).toBe(0);
  });
});

describe('distribuirPagamento — excesso de valor', () => {
  it('deve retornar sobra quando o valor recebido é maior que o total das parcelas', () => {
    const { totalAplicado, sobra } = distribuirPagamento([p1, p2], 600); // saldo total = 420

    expect(totalAplicado).toBe(420);
    expect(sobra).toBe(180);
  });

  it('deve quitar todas as parcelas selecionadas e não mais que o saldo', () => {
    const { entradas } = distribuirPagamento([p1, p2], 600);
    entradas.forEach((e) => {
      expect(e.valorAplicado).toBeLessThanOrEqual(e.saldo);
      expect(e.statusApos).toBe('paga');
    });
  });
});

describe('distribuirPagamento — saldo nunca negativo', () => {
  it('não deve gerar saldo negativo em nenhum cenário', () => {
    const cenarios = [5, 210, 211, 630, 1000];
    cenarios.forEach((valor) => {
      const { entradas } = distribuirPagamento([p1, p2, p3], valor);
      entradas.forEach((e) => {
        const novoSaldo = e.saldo - e.valorAplicado;
        expect(novoSaldo).toBeGreaterThanOrEqual(0);
      });
    });
  });
});

describe('distribuirPagamento — status correto por parcela', () => {
  it('parcela quitada → statusApos === "paga"', () => {
    const { entradas } = distribuirPagamento([p1], 210);
    expect(entradas[0].statusApos).toBe('paga');
  });

  it('parcela parcialmente quitada → statusApos === "parcial"', () => {
    const { entradas } = distribuirPagamento([p1], 100);
    expect(entradas[0].statusApos).toBe('parcial');
  });

  it('parcela não tocada → mantém o status original', () => {
    const pendente = parcela('x1', '2026-01-10', 500, 'pendente');
    const vencida = parcela('x2', '2026-02-10', 200, 'vencida');

    const { entradas } = distribuirPagamento([pendente, vencida], 0.01);

    const ex1 = entradas.find((e) => e.id === 'x1')!;
    expect(ex1.valorAplicado).toBe(0.01);
    expect(ex1.statusApos).toBe('parcial');

    const ex2 = entradas.find((e) => e.id === 'x2')!;
    expect(ex2.valorAplicado).toBe(0);
    expect(ex2.statusApos).toBe('vencida'); // inalterada
  });
});

describe('distribuirPagamento — consistência dos totais', () => {
  it('a soma dos valores aplicados deve sempre igualar o totalAplicado', () => {
    const { entradas, totalAplicado } = distribuirPagamento([p1, p2, p3], 350);
    const somaEntradas = entradas.reduce((s, e) => s + e.valorAplicado, 0);
    expect(Math.round(somaEntradas * 100)).toBe(Math.round(totalAplicado * 100));
  });

  it('totalAplicado + sobra deve igualar valorRecebido', () => {
    const valorRecebido = 999;
    const { totalAplicado, sobra } = distribuirPagamento([p1, p2, p3], valorRecebido);
    const soma = Math.round((totalAplicado + sobra) * 100);
    expect(soma).toBe(Math.round(valorRecebido * 100));
  });
});
