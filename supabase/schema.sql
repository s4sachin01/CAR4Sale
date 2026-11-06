-- AXONS AUTO V2 DATABASE SETUP
-- Run this entire file in Supabase Dashboard > SQL Editor > New query.
-- Create your first admin user in Authentication > Users before running
-- the final INSERT statement at the bottom (replace the UUID).

create extension if not exists pgcrypto;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.cars (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand text not null,
  model text not null,
  variant text,
  year integer not null check (year between 1980 and 2100),
  registration_year integer,
  registration_number text,
  price numeric(14,2) not null check (price >= 0),
  negotiable boolean not null default true,
  km_driven integer not null default 0 check (km_driven >= 0),
  fuel text not null,
  transmission text not null,
  engine_cc integer,
  bhp numeric(8,2),
  drivetrain text,
  ownership text,
  exterior_color text,
  interior_color text,
  insurance_valid_till date,
  insurance_type text,
  puc_valid_till date,
  tyre_condition text,
  city text,
  status text not null default 'available' check (status in ('available','reserved','sold')),
  featured boolean not null default false,
  description text,
  service_history text,
  accident_history text,
  images text[] not null default '{}'
);

create index if not exists cars_status_idx on public.cars(status);
create index if not exists cars_created_at_idx on public.cars(created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cars_updated_at on public.cars;
create trigger cars_updated_at before update on public.cars
for each row execute function public.set_updated_at();

-- Security helper. SECURITY DEFINER allows this function to check admins
-- without exposing the admin list to anonymous visitors.
create or replace function public.is_axons_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

alter table public.admins enable row level security;
alter table public.cars enable row level security;

drop policy if exists "Admins can read their own admin record" on public.admins;
create policy "Admins can read their own admin record"
on public.admins for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Anyone can view available cars" on public.cars;
create policy "Anyone can view available cars"
on public.cars for select to anon, authenticated
using (status = 'available');

drop policy if exists "Admins can view all cars" on public.cars;
create policy "Admins can view all cars"
on public.cars for select to authenticated
using (public.is_axons_admin());

drop policy if exists "Admins can insert cars" on public.cars;
create policy "Admins can insert cars"
on public.cars for insert to authenticated
with check (public.is_axons_admin());

drop policy if exists "Admins can update cars" on public.cars;
create policy "Admins can update cars"
on public.cars for update to authenticated
using (public.is_axons_admin())
with check (public.is_axons_admin());

drop policy if exists "Admins can delete cars" on public.cars;
create policy "Admins can delete cars"
on public.cars for delete to authenticated
using (public.is_axons_admin());

-- Create a PUBLIC bucket for car photos. Public means images can be viewed
-- on the public website. Upload/change/delete remains restricted to admins.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('car-images', 'car-images', true, 8388608, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = true, file_size_limit = 8388608,
allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif'];

drop policy if exists "Public can view car photos" on storage.objects;
create policy "Public can view car photos"
on storage.objects for select to public
using (bucket_id = 'car-images');

drop policy if exists "Axons admins can upload car photos" on storage.objects;
create policy "Axons admins can upload car photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'car-images' and public.is_axons_admin());

drop policy if exists "Axons admins can update car photos" on storage.objects;
create policy "Axons admins can update car photos"
on storage.objects for update to authenticated
using (bucket_id = 'car-images' and public.is_axons_admin())
with check (bucket_id = 'car-images' and public.is_axons_admin());

drop policy if exists "Axons admins can delete car photos" on storage.objects;
create policy "Axons admins can delete car photos"
on storage.objects for delete to authenticated
using (bucket_id = 'car-images' and public.is_axons_admin());

-- AFTER creating your user in Supabase Authentication > Users:
-- Copy that user's UUID and run this separately:
-- insert into public.admins (user_id) values ('PASTE-USER-UUID-HERE');
