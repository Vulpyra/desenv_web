-- ============================================================================
--  Migration 005 — gasto planejado no débito ou no crédito
-- ----------------------------------------------------------------------------
--  Uma despesa planejada ("Planejo gastar") passa a ter forma de pagamento:
--    * 'debito'  — sai do dinheiro livre do ciclo (comportamento anterior)
--    * 'credito' — vira também uma PARCELA na fatura do cartão
--
--  `planner_parcelas.categoria_id` liga a parcela à despesa planejada que a
--  originou, para que apagar uma das pontas apague a outra.
-- ============================================================================

alter table public.planner_categorias
  add column if not exists pagamento text not null default 'debito',
  add column if not exists parcelas  smallint;

alter table public.planner_parcelas
  add column if not exists categoria_id uuid
    references public.planner_categorias(id) on delete cascade;

create index if not exists idx_pl_parcelas_categoria
  on public.planner_parcelas (categoria_id);
