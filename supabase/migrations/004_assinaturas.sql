-- ============================================================================
--  Migration 004 — assinaturas (mensalidades do cartão)
-- ----------------------------------------------------------------------------
--  Assinaturas (Netflix, Spotify, etc.) têm a MESMA recorrência de uma conta
--  fixa — valem de um ciclo inicial até serem canceladas — mas aparecem dentro
--  da fatura do cartão. Em vez de uma tabela nova, reaproveitamos
--  planner_contas_fixas com um discriminador:
--
--    tipo = 'conta'      -> Contas fixas
--    tipo = 'assinatura' -> Assinaturas (dentro da fatura do cartão)
--
--  Cancelar uma assinatura no ciclo X grava ciclo_fim = X-1, ou seja, ela deixa
--  de ser cobrada a partir do mês do cancelamento (os meses passados continuam
--  no histórico).
-- ============================================================================

alter table public.planner_contas_fixas
  add column if not exists tipo text not null default 'conta';

create index if not exists idx_pl_contas_fixas_tipo
  on public.planner_contas_fixas (usuario_id, tipo);
