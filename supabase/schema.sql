-- ============================================================================
--  RendaFácil — full database schema
-- ----------------------------------------------------------------------------
--  Recreates every table, foreign key, index, RLS policy and trigger the app
--  relies on. Run it in the SQL editor of a NEW Supabase project to migrate.
--
--  Notes:
--   * Reconstructed from the application code — it covers every column the app
--     reads/writes. It does NOT copy DATA and won't include columns/triggers
--     that exist in your current DB but aren't used by the code.
--   * For an exact, data-included clone, prefer `supabase db dump` (Supabase CLI)
--     or pg_dump against the source project. Keep this file as the app's
--     canonical schema.
--   * Every statement is idempotent (safe to re-run): tables/indexes use
--     IF NOT EXISTS and policies are dropped-then-created.
--   * A "ciclo" (planner tables) is an integer = year*12 + month (month 0-11),
--     matching the app. e.g. June/2026 = 2026*12 + 5 = 24317.
-- ============================================================================

-- ============================================================================
--  1. USER TABLES  (profile + preferences, keyed to auth.users)
-- ============================================================================

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  nome          text,
  avatar_url    text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.preferencias (
  usuario_id      uuid primary key references auth.users(id) on delete cascade,
  moeda           text    not null default 'BRL',
  tema            text    not null default 'dark',
  notificacoes    boolean not null default true,
  ocultar_valores boolean not null default false,
  atualizado_em   timestamptz not null default now()
);

-- ============================================================================
--  2. FINANCE TABLES
-- ============================================================================
create extension if not exists pgcrypto;
-- Metas financeiras (goals). Created before "despesas" because despesas.meta_id
-- references it.
create table if not exists public.metas (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  nome        text not null,
  valor_alvo  numeric(12,2) not null default 0,
  valor_atual numeric(12,2) not null default 0,
  icone       text,
  cor1        text,
  cor2        text,
  criado_em   timestamptz not null default now()
);

-- Rendas (income entries).
--  * `data` is the deposit date (informational only).
--  * cycle membership is by DECLARATION: `ciclo_inicio` = the cycle index the
--    user was viewing when the entry was created (year*12 + month).
--  * `recorrente` income repeats every cycle from `ciclo_inicio` until `ciclo_fim`
--    (null = no end).
create table if not exists public.rendas (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references auth.users(id) on delete cascade,
  nome         text not null,
  valor        numeric(12,2) not null default 0,
  data         date,
  recorrente   boolean not null default false,
  ciclo_inicio integer,
  ciclo_fim    integer,
  icone        text,
  cor          text,
  criado_em    timestamptz not null default now()
);

-- Despesas (expenses). is_fixa distinguishes fixed vs one-off; meta_id links an
-- expense that is actually a contribution to a goal (aporte).
create table if not exists public.despesas (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  nome       text not null,
  valor      numeric(12,2) not null default 0,
  data       date,
  is_fixa    boolean not null default false,
  meta_id    uuid references public.metas(id) on delete cascade,
  criado_em  timestamptz not null default now()
);

-- Transações (activity feed). ref_id points at the renda/despesa that produced
-- the entry (polymorphic — intentionally no FK).
create table if not exists public.transacoes (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  tipo       text not null,
  nome       text not null,
  valor      numeric(12,2) not null default 0,
  ref_id     uuid,
  criado_em  timestamptz not null default now()
);

-- Histórico de patrimônio (net-worth history by month label)
create table if not exists public.patrimonio_historico (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references auth.users(id) on delete cascade,
  mes           text not null,
  valor         numeric(12,2) not null default 0,
  registrado_em timestamptz not null default now()
);

-- Simulados (tax-simulation form snapshots)
create table if not exists public.simulados (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  nome        text,
  cpf         text,
  idade       integer,
  salario     numeric(12,2) not null default 0,
  dependentes integer,
  saude       numeric(12,2) not null default 0,
  educacao    numeric(12,2) not null default 0,
  pgbl        numeric(12,2) not null default 0,
  observacoes text,
  criado_em   timestamptz not null default now()
);

-- ============================================================================
--  3. PLANNER TABLES  (recurring bills, installments, one-off buys, budgets)
-- ============================================================================

-- Contas fixas (recur from ciclo_inicio through ciclo_fim; null = no end)
create table if not exists public.planner_contas_fixas (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references auth.users(id) on delete cascade,
  nome         text not null,
  valor        numeric(12,2) not null default 0,
  dia          smallint not null default 1,
  essencial    boolean not null default true,
  ciclo_inicio integer not null,
  ciclo_fim    integer,
  criado_em    timestamptz not null default now()
);

-- Parcelas do cartão (parcela atual = ciclo_atual - ciclo_inicio + 1)
create table if not exists public.planner_parcelas (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid not null references auth.users(id) on delete cascade,
  nome           text not null,
  valor          numeric(12,2) not null default 0,
  ciclo_inicio   integer not null,
  total_parcelas smallint not null default 1,
  criado_em      timestamptz not null default now()
);

-- Compras únicas (only appear in the cycle they were entered)
create table if not exists public.planner_compras_unicas (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  nome       text not null,
  valor      numeric(12,2) not null default 0,
  ciclo      integer not null,
  criado_em  timestamptz not null default now()
);

-- Categorias de gasto planejado (recur; teto = per-cycle limit)
create table if not exists public.planner_categorias (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references auth.users(id) on delete cascade,
  nome         text not null,
  teto         numeric(12,2) not null default 0,
  essencial    boolean not null default false,
  ciclo_inicio integer not null,
  ciclo_fim    integer,
  criado_em    timestamptz not null default now()
);

-- Gasto lançado por categoria e ciclo (one row per categoria+ciclo)
create table if not exists public.planner_categoria_gastos (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references auth.users(id) on delete cascade,
  categoria_id uuid not null references public.planner_categorias(id) on delete cascade,
  ciclo        integer not null,
  valor        numeric(12,2) not null default 0,
  unique (categoria_id, ciclo)
);

-- Contas fixas pagas (row present = paid in that cycle)
create table if not exists public.planner_contas_pagas (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  conta_id   uuid not null references public.planner_contas_fixas(id) on delete cascade,
  ciclo      integer not null,
  primary key (conta_id, ciclo)
);

-- Fatura do cartão paga (row present = paid in that cycle)
create table if not exists public.planner_faturas_pagas (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  ciclo      integer not null,
  primary key (usuario_id, ciclo)
);

-- ============================================================================
--  4. INDEXES  (owner lookups)
-- ============================================================================
create index if not exists idx_metas_usuario                on public.metas(usuario_id);
create index if not exists idx_rendas_usuario               on public.rendas(usuario_id);
create index if not exists idx_despesas_usuario             on public.despesas(usuario_id);
create index if not exists idx_despesas_meta                on public.despesas(meta_id);
create index if not exists idx_transacoes_usuario           on public.transacoes(usuario_id);
create index if not exists idx_transacoes_ref               on public.transacoes(ref_id);
create index if not exists idx_patrimonio_usuario           on public.patrimonio_historico(usuario_id);
create index if not exists idx_simulados_usuario            on public.simulados(usuario_id);
create index if not exists idx_pl_contas_fixas_usuario      on public.planner_contas_fixas(usuario_id);
create index if not exists idx_pl_parcelas_usuario          on public.planner_parcelas(usuario_id);
create index if not exists idx_pl_compras_unicas_usuario    on public.planner_compras_unicas(usuario_id);
create index if not exists idx_pl_categorias_usuario        on public.planner_categorias(usuario_id);
create index if not exists idx_pl_categoria_gastos_usuario  on public.planner_categoria_gastos(usuario_id);
create index if not exists idx_pl_contas_pagas_usuario      on public.planner_contas_pagas(usuario_id);
create index if not exists idx_pl_faturas_pagas_usuario     on public.planner_faturas_pagas(usuario_id);

-- ============================================================================
--  5. ROW LEVEL SECURITY  (each user only sees their own rows)
-- ============================================================================
alter table public.profiles                  enable row level security;
alter table public.preferencias              enable row level security;
alter table public.metas                     enable row level security;
alter table public.rendas                    enable row level security;
alter table public.despesas                  enable row level security;
alter table public.transacoes                enable row level security;
alter table public.patrimonio_historico      enable row level security;
alter table public.simulados                 enable row level security;
alter table public.planner_contas_fixas      enable row level security;
alter table public.planner_parcelas          enable row level security;
alter table public.planner_compras_unicas    enable row level security;
alter table public.planner_categorias        enable row level security;
alter table public.planner_categoria_gastos  enable row level security;
alter table public.planner_contas_pagas      enable row level security;
alter table public.planner_faturas_pagas     enable row level security;

-- profiles are keyed by id (= auth.uid()); everything else by usuario_id.
drop policy if exists profiles_owner on public.profiles;
create policy profiles_owner on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists preferencias_owner on public.preferencias;
create policy preferencias_owner on public.preferencias
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists metas_owner on public.metas;
create policy metas_owner on public.metas
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists rendas_owner on public.rendas;
create policy rendas_owner on public.rendas
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists despesas_owner on public.despesas;
create policy despesas_owner on public.despesas
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists transacoes_owner on public.transacoes;
create policy transacoes_owner on public.transacoes
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists patrimonio_historico_owner on public.patrimonio_historico;
create policy patrimonio_historico_owner on public.patrimonio_historico
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists simulados_owner on public.simulados;
create policy simulados_owner on public.simulados
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists planner_contas_fixas_owner on public.planner_contas_fixas;
create policy planner_contas_fixas_owner on public.planner_contas_fixas
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists planner_parcelas_owner on public.planner_parcelas;
create policy planner_parcelas_owner on public.planner_parcelas
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists planner_compras_unicas_owner on public.planner_compras_unicas;
create policy planner_compras_unicas_owner on public.planner_compras_unicas
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists planner_categorias_owner on public.planner_categorias;
create policy planner_categorias_owner on public.planner_categorias
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists planner_categoria_gastos_owner on public.planner_categoria_gastos;
create policy planner_categoria_gastos_owner on public.planner_categoria_gastos
  for all
  using (
    auth.uid() = usuario_id
    and exists (
      select 1 from public.planner_categorias c
      where c.id = categoria_id and c.usuario_id = auth.uid()
    )
  )
  with check (
    auth.uid() = usuario_id
    and exists (
      select 1 from public.planner_categorias c
      where c.id = categoria_id and c.usuario_id = auth.uid()
    )
  );

drop policy if exists planner_contas_pagas_owner on public.planner_contas_pagas;
create policy planner_contas_pagas_owner on public.planner_contas_pagas
  for all
  using (
    auth.uid() = usuario_id
    and exists (
      select 1 from public.planner_contas_fixas c
      where c.id = conta_id and c.usuario_id = auth.uid()
    )
  )
  with check (
    auth.uid() = usuario_id
    and exists (
      select 1 from public.planner_contas_fixas c
      where c.id = conta_id and c.usuario_id = auth.uid()
    )
  );

drop policy if exists planner_faturas_pagas_owner on public.planner_faturas_pagas;
create policy planner_faturas_pagas_owner on public.planner_faturas_pagas
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

-- ============================================================================
--  6. AUTO-PROVISION profile + preferences on signup
--     (the app also upserts these, so this is a convenience/robustness layer)
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.preferencias (usuario_id)
  values (new.id)
  on conflict (usuario_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
--  End of schema
-- ============================================================================
