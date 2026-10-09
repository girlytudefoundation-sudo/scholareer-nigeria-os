create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select _user_id = auth.uid()
    and exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = _role
    )
$$;

create or replace function public.is_school_member(_user_id uuid, _school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select _user_id = auth.uid()
    and exists (
      select 1 from public.school_members
      where user_id = auth.uid() and school_id = _school_id
    )
$$;

create or replace function public.can_claim_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1 from auth.users
      where id = auth.uid()
        and email_confirmed_at is not null
        and lower(email) = 'imohtalit@gmail.com'
    )
    and not exists (
      select 1 from public.user_roles where role = 'super_admin'
    )
$$;
revoke all on function public.can_claim_platform_owner() from public, anon;
grant execute on function public.can_claim_platform_owner() to authenticated;