-- =====================================================
-- Custom Access Token Hook: `role` ni JWT ichiga joylash
-- =====================================================
-- Maqsad: middleware har bir navigatsiyada `users` jadvalidan
-- rolni so'ramasligi uchun rol imzolangan JWT ichida keladi.
-- Xavfsiz: token Supabase tomonidan imzolanadi, mijoz uni
-- soxtalashtira olmaydi (eski `user-role` cookie'dan farqli).
--
-- ⚠️ O'RNATISH: Ushbu SQL ni ishga tushirgandan so'ng Supabase
-- Dashboard → Authentication → Hooks (Beta) bo'limida
-- "Custom Access Token" hook sifatida `public.custom_access_token_hook`
-- ni tanlab, yoqib qo'ying. Hook yoqilmasa, claim JWT'ga qo'shilmaydi
-- (middleware avtomatik DB fallback'ga o'tadi — hech narsa buzilmaydi).
-- =====================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  v_role text;
begin
  -- users.id === auth.users.id. `id::text` cast — ustun uuid ham,
  -- text ham bo'lsa ishlaydi (`uuid = text` operatori mavjud emas).
  select role into v_role
  from public.users
  where id::text = (event->>'user_id');

  claims := event->'claims';

  -- Rol topilsa string sifatida, aks holda null sifatida yoziladi.
  -- Har ikki holatda ham `user_role` kaliti mavjud bo'ladi — bu
  -- middleware'ga "claim keldi, DB so'roviga hojat yo'q" degan signal.
  if v_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role));
  else
    claims := jsonb_set(claims, '{user_role}', 'null'::jsonb);
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Faqat Supabase Auth admini bu funksiyani chaqira oladi
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- Hook `users` jadvalini o'qiy olishi uchun (RLS yoqilgan)
grant select on public.users to supabase_auth_admin;

drop policy if exists "auth_admin_read_users" on public.users;
create policy "auth_admin_read_users" on public.users
  as permissive for select
  to supabase_auth_admin
  using (true);
