-- ============================================================================
--  Migration 002 — importação de faturas (CSV)
-- ----------------------------------------------------------------------------
--  Necessária para o botão "Importar" do painel "Preciso pagar".
--
--  Adiciona a parcelas e compras únicas:
--    * data        — data real da compra (permite filtrar por dia e exibir a data)
--    * categoria   — categoria vinda do CSV (ex.: TRANSPORTE)
--    * fingerprint — chave de deduplicação; impede que o mesmo lançamento entre
--                    duas vezes ao reimportar o mesmo CSV ou CSVs que se sobrepõem
--
--  O índice único é PARCIAL (só quando fingerprint não é nulo), então itens
--  criados manualmente (fingerprint nulo) nunca conflitam entre si.
-- ============================================================================

alter table public.planner_compras_unicas
  add column if not exists data        date,
  add column if not exists categoria   text,
  add column if not exists fingerprint text;

alter table public.planner_parcelas
  add column if not exists data        date,
  add column if not exists categoria   text,
  add column if not exists fingerprint text;

create unique index if not exists ux_planner_compras_unicas_fingerprint
  on public.planner_compras_unicas (usuario_id, fingerprint)
  where fingerprint is not null;

create unique index if not exists ux_planner_parcelas_fingerprint
  on public.planner_parcelas (usuario_id, fingerprint)
  where fingerprint is not null;
