-- Inclui o cupom FRETEFM (frete grátis, 2 vitórias) na lista de códigos aceitos.
-- Rode UMA vez no Supabase: SQL Editor → New query → cole tudo → Run.
-- Os códigos antigos continuam aceitos para não invalidar as partidas já gravadas.

alter table public.lead_coupons drop constraint if exists lead_coupons_coupon_check;

alter table public.lead_coupons add constraint lead_coupons_coupon_check check (coupon in (
  'FABIOLA15', 'FRETEFM', 'JOGOFM10', 'FAB05',
  'NADADOR20', 'FABIOLA20', 'FABIOLA10', 'FABIOLA5'
));
