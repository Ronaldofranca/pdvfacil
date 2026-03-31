# Política de Segurança e Proteção de Dados (VendaForce / PDV Fácil)

Este documento estabelece as diretrizes rigorosas para garantir que alterações de código, refatorações, testes e deploys nunca comprometam, corrompam ou apaguem a integridade dos dados reais de operação.

---

## 1. Política de Segurança para Mudanças de Código
Nenhuma alteração de código, mudança de layout, atualização de lógica de negócio ou deploy deve chegar ao ambiente de produção sem validação prévia. 

*   **Isolamento Absoluto:** Código em desenvolvimento jamais deve se conectar à base de dados de produção. Scripts de teste e seeds são proibidos de rodar no banco real.
*   **Princípio Imutável:** Mudanças estruturais (migrations) só podem *adicionar* (novas tabelas, novas colunas não-nulas) ou utilizar *soft-delete* (marcar como inativo). "Destruir" dados estruturais requer dupla aprovação.
*   **Contenção de Erros de Frontend:** Erros visuais, refatorações de tela ou de formulários não podem, sob nenhuma circunstância, gerar chamadas de mutação (API) acidentais que alterem dados já consolidados.

## 2. Dados Considerados Críticos
Os seguintes dados possuem **proteção máxima** e sob hipótese alguma podem ser apagados, corrompidos ou recalculados silenciosamente sem rastreio:
1.  **Vendas finalizadas** e seus detalhamentos (itens, impostos, descontos).
2.  **Movimentações e Histórico Financeiro** (Contas a Receber, Contas a Pagar).
3.  **Transações de Pagamento** confirmadas e consolidadas.
4.  **Parcelas geradas** e contratos de crediário assumidos.
5.  **Estoque** (movimentações efetuadas e saldos consolidados).
6.  **Cadastro de clientes** e relacionamentos contratuais estruturais.
7.  **Snapshots de relatórios** gerenciais fechados (DRE, Caixas, Resumo Mensal).

## 3. Regras de Proteção por Ambiente
A arquitetura do projeto (Supabase + React) define três níveis impermeáveis:

*   **Desenvolvimento (Local/Dev):** Usa Docker/Supabase CLI (localhost). **Estritamente proibido** colocar chaves de produção (Service Role Keys e Anon Keys) no `.env.local` de desenvolvedores. Seeds, resets totais de banco e ferramentas destrutivas só funcionam aqui.
*   **Homologação (Staging):** Ambiente em nuvem espelho da Produção, populado apenas com dados sintéticos. Serve para garantir que a *migration* não quebra, testar fluxos novos com integrações terceiras e aprovar Quality Assurance (QA).
*   **Produção (Production):** Ambiente blindado utilizado apenas pelos usuários clientes reais. Nenhuma inserção manual de código não testado acontece aqui.

## 4. Regras para Migrations Seguras
No Supabase, migrações são o maior risco estrutural. Elas devem seguir regras rígidas:
*   **Bloqueios Sistêmicos:** Comandos perigosos como `DROP TABLE`, `DROP COLUMN`, `ALTER TYPE` (com risco de trunco), ou cálculos de update sem WHERE são considerados violações da política por padrão. Devem passar por aprovação por pares.
*   **Retrocompatibilidade Linear:** Nunca apague um campo utilizado pela versão em produção enquanto faz deploy progressivo. Crie uma nova coluna, use o código antigo e o novo ao mesmo tempo, sincronize, e só "zere/desative" a estrutura velha semanas depois.
*   **Gatilho de Rollback:** Toda migration destrutiva deve ter backup completo executado 2 minutos antes e um plano traçado: "Se travar a aplicação no minuto 1, o `down.sql` garante retorno seguro?"

## 5. Regras para Dados Históricos
A Imutabilidade é a lei de proteção financeira:
*   **Nunca Dar DELETE:** Um dado consolidado (`venda finalizada`, `parcela atrelada`, `pagamento recebido`) se tornou Lei.
*   **Processo de Estorno:** Qualquer ajuste deve ocorrer via trâmite oficial do sistema e documentado no banco de dados. Cancela-se o recebimento com uma nova transação ou um registro inverso, justificando a alteração. O sistema não permite "editar uma venda passada" para mudar itens ou valor silenciosamente.
*   **Métricas Cristalizadas:** Mudanças em lógicas de cálculos ou regras de negócio valem *a partir da data do deploy em diante*. O passado não é recalculado (sobrescrito), a menos que originado de uma auditoria oficial explícita com backup.

## 6. Estratégia de Backup e Rollback
*   **Mecanismo Diário (PITR - Point-in-Time Recovery):** Produção obriga o PITR rodando de fundo no Postgres (Supabase ativado).
*   **Trigger Pré-Ação Crítica:** Mudanças gigantes que mexem no esquema de faturamento, crediários, parcelas ou estoque exigem o download explícito de um dump do banco imediatamente antes de apertar "Merge/Deploy".
*   **Rollback de Emergência:** Se o novo PR gerar erros financeiros, a regra não é "criar novos patches intermináveis tentando corrigir em prod", e sim invocar **Revert** do PR/Commit imeditamente, reestabelecendo a versão funcional anterior. Só então a equipe analisa o erro com calma em *Staging*.

## 7. Checklist Obrigatório de Pré-Deploy
- [ ] Confirmação de 100% de separação de chaves (sem chaves DEV vazadas).
- [ ] Backup ou snapshot do banco de dados disparado manualmente.
- [ ] O script da `migration` roda do zero a limpo no ambiente sandbox antes?
- [ ] Código novo afeta queries antigas de relatórios?
- [ ] Foi adotada uma Feature Flag para lançamentos arriscados, permitindo deligamento instantâneo?
- [ ] Nenhum script `seeds.ts` ou chamadas `reset_db()` está apontando ou acessando URL de Prod?
- [ ] Nenhuma rota perigosa exposta. O plano de reversão está pronto na manga.

## 8. Checklist Obrigatório de Pós-Deploy
- [ ] Contagem rápida garante: total de clientes mudou? (Não). O total financeiro arrecadado de ontem mudou? (Não). Relatórios de venda de ontem continuam batendo 100% com dados anteriores?
- [ ] Realizar os fluxos de **Smoke Tests:** Tentar concretizar uma "Venda Nova", marcar como "Paga" e em seguida realizar o estorno no ambiente Prod (utilizando usuários laranjas) para atestar saúde sistêmica.
- [ ] Nenhum bloqueio de RLS falso-positivo registrado na tela preta / console ou na tabela `security_logs`.

## 9. Validações Automáticas Recomendadas
Configuração de **Cron Jobs** de "Batimento" e alertas automatizados contínuos:
1.  **Guardião de Órfãs:** Um script valida se existem `parcelas` listando um `venda_id` inexistente (ou com falha na tabela `vendas`).
2.  **Guardião de Soma:** `Valor total do financeiro pago` !== `Total da Venda Final`. Se a diferença por arredondamento sistêmico ultrapassar limite configurado, dispara alarme.
3.  **Estoque Reverso Negativo:** Validar tabelas de estoque em massa (se algum `saldo < 0` e não opera assim, registrar incidente na hora).
4.  **Integração Relacional:** Clientes que efetuaram transações recentes perdem ligações e seus cadastros viram "null"? Monitorar.

## 10. Logs e Auditoria Recomendados
*   Habilitar **Supabase Audit Extension** (padrão) para as quatro tabelas de ouro (Vendas, Pagamentos, Parcelas e Estoque).
*   As **Triggers do Postgres** gravam passivamente: Quem (user_id real autenticado), Quando, Tipo da Ação (UPDATE, DELETE), Payload Original (estado velho), Payload Atual (estado novo).
*   Se um campo fundamental for alterado indevidamente no front-end, o banco acusa a mudança da linha, sabendo o que existia ali antes.

## 11. Sugestões Técnicas para Implementar no Projeto
No ecossistema atual (*Supabase + React + Postgres*), propomos a aplicação das seguintes blindagens sistêmicas rigorosas:

1.  **Travas Definitivas de RLS `FOR UPDATE/DELETE`:**
    Implemente políticas no banco (`Row Level Security`) para que o Postgres bloqueie naturalmente *backends* (API / Código Front) de mudar um status encerrado.
    Exemplo: 
    *`CREATE POLICY "Vendas finalizadas imutáveis" ON vendas FOR UPDATE USING (status != 'finalizada');`*
    Isso impede silenciosamente o pior dos problemas.

2.  **Constraints Físicas (`ON DELETE RESTRICT`):**
    Uma tabela de clientes só pode levar `DELETE` se ele não tiver `vendas` anexadas. Defina relacionamentos via banco `RESTRICT` para que tabelas de faturamento protejam entidades conectadas.

3.  **Ambiente Docker Local (Sandbox Oficial):**
    Forçar o comando `npx supabase start`. Se o desenvolvedor tentar rodar a build conectando ao IP do banco de nuvem sem credenciais autorizadas de homologação, o programa se encerra sozinho.

4.  **Testes Destrutivos Deslocados (Vitest / Playwright):**
    Isolar as bibliotecas de teste e seus runners e assegurar que as `.env.test` são obrigatórias, impedindo que scripts do tipo `afterAll(() => database.clear())` alcancem produção de forma sistêmica.
