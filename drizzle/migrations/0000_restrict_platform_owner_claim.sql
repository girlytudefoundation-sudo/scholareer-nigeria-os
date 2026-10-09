create or replace function public.claim_platform_owner()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  verified_email text;
begin
  if auth.uid() is null then return false; end if;

  select lower(email)
    into verified_email
    from auth.users
    where id = auth.uid()
      and email_confirmed_at is not null;

  if verified_email is distinct from 'imohtalit@gmail.com' then
    return false;
  end if;

  if exists (select 1 from public.user_roles where role = 'super_admin') then
    return false;
  end if;

  insert into public.user_roles (user_id, role)
  values (auth.uid(), 'super_admin')
  on conflict (user_id, role) do nothing;

  insert into public.platform_audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'OWNER_CLAIMED', 'Platform', auth.uid()::text, '{}');

  return true;
end;
$$;
revoke all on function public.claim_platform_owner() from public, anon;
grant execute on function public.claim_platform_owner() to authenticated;