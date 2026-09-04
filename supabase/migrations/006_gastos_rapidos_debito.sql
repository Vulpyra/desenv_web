-- ============================================================================
--  Migration 006 — gastos rápidos no débito
-- ----------------------------------------------------------------------------
--  Uma compra avulsa passa a saber COMO foi paga:
--    * 'credito' — entra na fatura do cartão (comportamento anterior, padrão)
--    * 'debito'  — sai direto da conta: reduz o "livre para gastar" do ciclo,
--                  mas NÃO entra na fatura nem no "restante a pagar"
--                  (dinheiro que já saiu).
-- ============================================================================

alter table public.planner_compras_unicas
  add column if not exists pagamento text not null default 'credito';

create index if not exists idx_pl_compras_unicas_pagamento
  on public.planner_compras_unicas (usuario_id, pagamento);
