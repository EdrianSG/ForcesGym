-- =============================================================================
-- ForcesGym — esquema inicial
-- =============================================================================
-- Cómo usar:
-- 1. Abre Supabase → SQL Editor
-- 2. Pega y ejecuta este archivo completo
-- 3. No contiene DROP TABLE ni borra datos
--
-- Si lo ejecutas más de una vez, las políticas se recrean y los INSERT
-- de planes usan ON CONFLICT. Las tablas usan IF NOT EXISTS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Funciones auxiliares
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.normalize_member_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.membership_number := trim(new.membership_number);
  new.full_name := trim(new.full_name);
  new.dni := trim(new.dni);
  new.phone := coalesce(trim(new.phone), '');
  return new;
end;
$$;

-- Impide que un usuario autenticado se asigne el rol admin desde el cliente.
-- En SQL Editor auth.uid() es null, así que ahí sí se puede promover a admin.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role then
    raise exception 'El rol del perfil no se puede cambiar desde la aplicación';
  end if;

  return new;
end;
$$;

-- Al crear un usuario en Auth se genera su perfil.
-- El rol inicial siempre es staff: nadie puede autoasignarse admin
-- enviando metadata. El primer administrador se promueve a mano (ver final).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'Staff'),
    'staff'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Tablas
-- -----------------------------------------------------------------------------

-- Perfiles del personal administrativo. El id es el mismo de auth.users.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) > 0),
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Usuarios administrativos. Los clientes del gimnasio no tienen cuenta.';

-- Clientes del gimnasio. No inician sesión.
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  membership_number text not null,
  full_name text not null,
  dni text not null,
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint members_membership_number_not_blank
    check (length(trim(membership_number)) > 0),
  constraint members_full_name_not_blank
    check (length(trim(full_name)) > 0),
  constraint members_dni_not_blank
    check (length(trim(dni)) > 0),
  constraint members_membership_number_unique unique (membership_number),
  constraint members_dni_unique unique (dni)
);

comment on table public.members is
  'Clientes del gimnasio. El teléfono puede repetirse; DNI y membresía no.';

-- Catálogo de planes. No se eliminan si ya tienen historial: se desactivan.
create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10, 2) not null,
  duration_days integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint membership_plans_name_not_blank
    check (length(trim(name)) > 0),
  constraint membership_plans_name_unique unique (name),
  constraint membership_plans_price_non_negative
    check (price >= 0),
  constraint membership_plans_duration_positive
    check (duration_days > 0)
);

comment on column public.membership_plans.price is
  'Precio vigente del plan. Las suscripciones históricas guardan price_paid.';

-- Historial de membresías. Cada renovación es un INSERT, nunca un UPDATE.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete restrict,
  plan_id uuid not null references public.membership_plans (id) on delete restrict,
  start_date date not null,
  end_date date not null,
  price_paid numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  constraint subscriptions_dates_valid check (end_date >= start_date),
  constraint subscriptions_price_paid_non_negative check (price_paid >= 0)
);

comment on table public.subscriptions is
  'Historial inmutable de membresías. El estado ACTIVO/VENCIDO se calcula con end_date.';

comment on column public.subscriptions.price_paid is
  'Monto realmente cobrado. Si el plan cambia de precio después, este valor no se altera.';

comment on column public.subscriptions.end_date is
  'Último día válido. ACTIVO si end_date >= fecha de hoy en America/Lima.';

-- -----------------------------------------------------------------------------
-- 3. Índices
-- -----------------------------------------------------------------------------

create index if not exists members_full_name_idx
  on public.members (full_name);

create index if not exists members_phone_idx
  on public.members (phone);

-- La búsqueda en recepción por número y DNI ya está cubierta por UNIQUE.

create index if not exists subscriptions_member_id_idx
  on public.subscriptions (member_id);

create index if not exists subscriptions_plan_id_idx
  on public.subscriptions (plan_id);

create index if not exists subscriptions_end_date_idx
  on public.subscriptions (end_date);

create index if not exists subscriptions_member_end_idx
  on public.subscriptions (member_id, end_date desc);

create index if not exists membership_plans_active_idx
  on public.membership_plans (active);

-- -----------------------------------------------------------------------------
-- 4. Triggers
-- -----------------------------------------------------------------------------

drop trigger if exists members_set_updated_at on public.members;
create trigger members_set_updated_at
  before update on public.members
  for each row
  execute function public.set_updated_at();

drop trigger if exists members_normalize_fields on public.members;
create trigger members_normalize_fields
  before insert or update on public.members
  for each row
  execute function public.normalize_member_fields();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row
  execute function public.protect_profile_role();

-- -----------------------------------------------------------------------------
-- 5. Vista: suscripción más reciente por cliente
-- -----------------------------------------------------------------------------
-- No guarda status. El frontend (o una consulta) lo calcula con end_date.
-- security_invoker = true aplica RLS de members/subscriptions al leer la vista.

create or replace view public.member_latest_subscriptions
with (security_invoker = true) as
select distinct on (s.member_id)
  s.member_id,
  s.id as subscription_id,
  s.plan_id,
  p.name as plan_name,
  s.start_date,
  s.end_date,
  s.price_paid,
  s.created_at
from public.subscriptions s
inner join public.membership_plans p on p.id = s.plan_id
order by s.member_id, s.end_date desc, s.created_at desc;

comment on view public.member_latest_subscriptions is
  'Última suscripción de cada cliente, según end_date y created_at.';

-- -----------------------------------------------------------------------------
-- 6. Permisos
-- -----------------------------------------------------------------------------
-- anon no debe leer ni escribir datos privados (DNI, teléfonos, etc.).
-- authenticated puede leer y escribir, pero no borrar.
-- Los planes con historial no se eliminan: se pone active = false.

revoke all on table public.profiles from anon, public;
revoke all on table public.members from anon, public;
revoke all on table public.membership_plans from anon, public;
revoke all on table public.subscriptions from anon, public;
revoke all on table public.member_latest_subscriptions from anon, public;

grant select on table public.profiles to authenticated;
grant update on table public.profiles to authenticated;

grant select, insert, update on table public.members to authenticated;
grant select, insert, update on table public.membership_plans to authenticated;
grant select, insert on table public.subscriptions to authenticated;
grant select on table public.member_latest_subscriptions to authenticated;

-- Las suscripciones no se actualizan ni se borran desde la app:
-- el historial debe permanecer intacto.

-- -----------------------------------------------------------------------------
-- 7. Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.membership_plans enable row level security;
alter table public.subscriptions enable row level security;

alter table public.profiles force row level security;
alter table public.members force row level security;
alter table public.membership_plans force row level security;
alter table public.subscriptions force row level security;

-- profiles
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated
  on public.profiles
  for select
  to authenticated
  using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- members
drop policy if exists members_select_authenticated on public.members;
create policy members_select_authenticated
  on public.members
  for select
  to authenticated
  using (true);

drop policy if exists members_insert_authenticated on public.members;
create policy members_insert_authenticated
  on public.members
  for insert
  to authenticated
  with check (true);

drop policy if exists members_update_authenticated on public.members;
create policy members_update_authenticated
  on public.members
  for update
  to authenticated
  using (true)
  with check (true);

-- membership_plans
drop policy if exists plans_select_authenticated on public.membership_plans;
create policy plans_select_authenticated
  on public.membership_plans
  for select
  to authenticated
  using (true);

drop policy if exists plans_insert_authenticated on public.membership_plans;
create policy plans_insert_authenticated
  on public.membership_plans
  for insert
  to authenticated
  with check (true);

drop policy if exists plans_update_authenticated on public.membership_plans;
create policy plans_update_authenticated
  on public.membership_plans
  for update
  to authenticated
  using (true)
  with check (true);

-- subscriptions: insertar sí, update/delete no (historial).
drop policy if exists subscriptions_select_authenticated on public.subscriptions;
create policy subscriptions_select_authenticated
  on public.subscriptions
  for select
  to authenticated
  using (true);

drop policy if exists subscriptions_insert_authenticated on public.subscriptions;
create policy subscriptions_insert_authenticated
  on public.subscriptions
  for insert
  to authenticated
  with check (true);

-- -----------------------------------------------------------------------------
-- 8. Datos iniciales de planes
-- -----------------------------------------------------------------------------

insert into public.membership_plans (name, price, duration_days, active)
values
  ('Normal', 120, 30, true),
  ('Estudiante', 80, 30, true)
on conflict (name) do nothing;

-- -----------------------------------------------------------------------------
-- 9. Después de ejecutar: crear el usuario admin
-- -----------------------------------------------------------------------------
-- 1. Authentication → Users → Add user
--    email / password del administrador
-- 2. El trigger crea el perfil con role = staff
-- 3. Promuévelo a admin (reemplaza el email):
--
-- update public.profiles
-- set role = 'admin',
--     full_name = 'Administrador'
-- where id = (
--   select id from auth.users where email = 'admin@tudominio.com'
-- );
-- =============================================================================
