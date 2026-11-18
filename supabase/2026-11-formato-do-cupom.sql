-- Cupons (nov/2026): o banco deixa de ter a lista de códigos e passa a conferir só o formato
-- (letras maiúsculas e números, 3 a 20 caracteres). Assim trocar cupom no jogo não exige outro SQL.
-- Rode UMA vez no Supabase: SQL Editor → New query → cole tudo → Run.
-- As partidas já gravadas continuam válidas.

alter table public.lead_coupons drop constraint if exists lead_coupons_coupon_check;

alter table public.lead_coupons add constraint lead_coupons_coupon_check
  check (coupon ~ '^[A-Z0-9]{3,20}$');
