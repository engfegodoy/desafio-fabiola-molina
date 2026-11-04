-- Tabela de leads do Desafio Fabiola Molina.
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  email text not null check (
    char_length(email) <= 254
    and email = lower(email)
    and email ~ '^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$'
  ),
  consent boolean not null check (consent),
  source text not null default 'desafio-fabiola-molina' check (char_length(source) <= 60)
);

-- Um cadastro por e-mail (quem volta a jogar recebe 409 e segue jogando).
create unique index if not exists leads_email_key on public.leads (email);

-- Segurança: o site (chave pública "anon") só pode INSERIR. Ninguém lê, altera ou apaga pelo site.
alter table public.leads enable row level security;

drop policy if exists "site insere leads" on public.leads;
create policy "site insere leads" on public.leads
  for insert to anon
  with check (consent);

revoke all on public.leads from anon, authenticated;
grant insert (name, email, consent, source) on public.leads to anon;
