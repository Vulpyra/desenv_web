-- ============================================================================
--  Migration 003 — ciclo de faturamento do cartão
-- ----------------------------------------------------------------------------
--  A fatura do cartão tem um ciclo próprio, diferente do ciclo de salário do
--  painel. Ex.: fecha dia 15 e vence dia 22 → a fatura reúne as compras de
--  15/07 a 14/08 e é paga em 22/08.
--
--  Guarda a configuração do cartão por usuário:
--    * usar_ciclo     — quando false, cada compra continua caindo no ciclo da
--                       própria data (comportamento anterior)
--    * dia_fechamento — dia em que a fatura fecha
--    * dia_vencimento — dia em que a fatura vence (se < fechamento, vence no
--                       mês seguinte)
-- ============================================================================

create table if not exists public.planner_cartao (
  usuario_id     uuid primary key references auth.users(id) on delete cascade,
  usar_ciclo     boolean  not null default false,
  dia_fechamento smallint not null default 15,
  dia_vencimento smallint not null default 22,
  atualizado_em  timestamptz not null default now()
);

alter table public.planner_cartao enable row level security;

drop policy if exists planner_cartao_owner on public.planner_cartao;
create policy planner_cartao_owner on public.planner_cartao
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);
