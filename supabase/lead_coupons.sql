-- Cupons ganhos por cada lead (uma linha por partida terminada).
-- Rode no Supabase DEPOIS de leads.sql: SQL Editor → New query → cole tudo → Run.

create table if not exists public.lead_coupons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null references public.leads (email) on delete cascade,
  coupon text not null check (coupon in ('FABIOLA20', 'FABIOLA15', 'FABIOLA10', 'FABIOLA5')),
  wins smallint not null check (wins between 0 and 3)
);

create index if not exists lead_coupons_email_idx on public.lead_coupons (email);

-- Segurança: o site (chave pública) só pode INSERIR. Ninguém lê, altera ou apaga pelo site.
alter table public.lead_coupons enable row level security;

drop policy if exists "site insere cupons" on public.lead_coupons;
create policy "site insere cupons" on public.lead_coupons
  for insert to anon
  with check (true);

revoke all on public.lead_coupons from anon, authenticated;
grant insert (email, coupon, wins) on public.lead_coupons to anon;

-- Visão para consultar no painel: cada lead com o MELHOR cupom e quantas partidas terminou.
create or replace view public.leads_com_cupom
with (security_invoker = true) as
select
  l.created_at as cadastro,
  l.name as nome,
  l.email,
  c.coupon as melhor_cupom,
  c.wins as vitorias,
  c.created_at as data_do_cupom,
  (select count(*) from public.lead_coupons x where x.email = l.email) as partidas
from public.leads l
left join lateral (
  select coupon, wins, created_at
  from public.lead_coupons c
  where c.email = l.email
  order by c.wins desc, c.created_at desc
  limit 1
) c on true
order by l.created_at desc;

revoke all on public.leads_com_cupom from anon, authenticated;
