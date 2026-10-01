-- ===== Enums =====
create type public.app_role as enum ('super_admin');
create type public.school_status as enum ('trial','active','overdue','paused','suspended');
create type public.school_role as enum ('school_admin','principal','bursar','cashier','teacher');
create type public.billing_cycle as enum ('trial','monthly','termly','annual','custom');
create type public.payment_verification as enum ('pending','verified','rejected');

-- ===== Profiles =====
create table public.profiles (
  id uuid primary key,
  email text not null,
  full_name text not null default '',
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ===== Platform roles =====
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles readable" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'super_admin'));

-- ===== Plans =====
create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  billing_cycle billing_cycle not null default 'termly',
  price numeric(14,2) not null default 0 check (price >= 0),
  duration_days integer not null default 120 check (duration_days > 0),
  student_limit integer not null default 500 check (student_limit > 0),
  features text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.subscription_plans to authenticated;
grant all on public.subscription_plans to service_role;
alter table public.subscription_plans enable row level security;
create policy "plans readable by signed in" on public.subscription_plans for select to authenticated using (true);
create policy "plans managed by super admin" on public.subscription_plans for all to authenticated
  using (public.has_role(auth.uid(),'super_admin')) with check (public.has_role(auth.uid(),'super_admin'));

-- ===== Schools =====
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  email text,
  phone text,
  address text,
  state text,
  school_type text not null default 'Secondary',
  status school_status not null default 'trial',
  status_reason text,
  status_changed_at timestamptz,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.schools to authenticated;
grant all on public.schools to service_role;
alter table public.schools enable row level security;

create table public.school_members (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null,
  role school_role not null,
  created_at timestamptz not null default now(),
  unique (school_id, user_id, role)
);
grant select on public.school_members to authenticated;
grant all on public.school_members to service_role;
alter table public.school_members enable row level security;

create or replace function public.is_school_member(_user_id uuid, _school_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.school_members where user_id = _user_id and school_id = _school_id)
$$;

-- True when the school may use restricted features (not suspended/paused). Use in all school-data policies.
create or replace function public.school_is_operational(_school_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.schools where id = _school_id and status in ('trial','active','overdue'))
$$;

create policy "super admin manages schools" on public.schools for all to authenticated
  using (public.has_role(auth.uid(),'super_admin')) with check (public.has_role(auth.uid(),'super_admin'));
create policy "members read own school" on public.schools for select to authenticated
  using (public.is_school_member(auth.uid(), id));

create policy "members read memberships" on public.school_members for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'super_admin'));

create policy "profiles self or super admin read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'super_admin'));
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ===== Subscriptions =====
create table public.school_subscriptions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  plan_name text not null,
  billing_cycle billing_cycle not null,
  starts_on date not null,
  ends_on date not null,
  amount_due numeric(14,2) not null default 0 check (amount_due >= 0),
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);
grant select on public.school_subscriptions to authenticated;
grant all on public.school_subscriptions to service_role;
alter table public.school_subscriptions enable row level security;
create policy "subs super admin or member read" on public.school_subscriptions for select to authenticated
  using (public.has_role(auth.uid(),'super_admin') or public.is_school_member(auth.uid(), school_id));

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  subscription_id uuid references public.school_subscriptions(id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  paid_on date not null,
  method text not null default 'Bank transfer',
  reference text not null,
  verification payment_verification not null default 'pending',
  verified_by uuid,
  verified_at timestamptz,
  recorded_by uuid,
  created_at timestamptz not null default now()
);
grant select on public.subscription_payments to authenticated;
grant all on public.subscription_payments to service_role;
alter table public.subscription_payments enable row level security;
create policy "payments super admin or member read" on public.subscription_payments for select to authenticated
  using (public.has_role(auth.uid(),'super_admin') or public.is_school_member(auth.uid(), school_id));

-- ===== Platform settings (single row) =====
create table public.platform_settings (
  id integer primary key default 1 check (id = 1),
  grace_period_days integer not null default 14 check (grace_period_days >= 0),
  auto_mark_overdue boolean not null default true,
  auto_suspend_after_grace boolean not null default false,
  suspend_blocks_result_checker boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (id) values (1);
grant select on public.platform_settings to authenticated;
grant all on public.platform_settings to service_role;
alter table public.platform_settings enable row level security;
create policy "settings readable" on public.platform_settings for select to authenticated using (true);

-- ===== Platform audit log (append only) =====
create table public.platform_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text not null,
  entity text not null,
  entity_id text,
  school_id uuid,
  school_name text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
grant select on public.platform_audit_logs to authenticated;
grant all on public.platform_audit_logs to service_role;
alter table public.platform_audit_logs enable row level security;
create policy "audit super admin read" on public.platform_audit_logs for select to authenticated
  using (public.has_role(auth.uid(),'super_admin'));

-- ===== Profile auto-create =====
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email,''), coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== One-time owner bootstrap: only works while no super admin exists =====
create or replace function public.claim_platform_owner()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.user_roles where role = 'super_admin') then return false; end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), 'super_admin');
  insert into public.platform_audit_logs (actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'OWNER_CLAIMED', 'Platform', auth.uid()::text, '{}');
  return true;
end $$;
revoke all on function public.claim_platform_owner() from public, anon;
grant execute on function public.claim_platform_owner() to authenticated;

create or replace function public.platform_owner_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'super_admin')
$$;
grant execute on function public.platform_owner_exists() to anon, authenticated;

-- Seed default plans
insert into public.subscription_plans (name, billing_cycle, price, duration_days, student_limit, features) values
 ('Free Trial','trial',0,30,100,array['Students','Results','Report cards']),
 ('Starter (Termly)','termly',75000,120,300,array['Students','Results','Report cards','Attendance','Fees']),
 ('Standard (Termly)','termly',150000,120,800,array['Students','Results','Report cards','Attendance','Fees','Library','ID cards','Result checker']),
 ('Premium (Annual)','annual',500000,365,2500,array['All features','Priority support']);