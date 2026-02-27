-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create User Roles Enum
create type user_role as enum ('admin', 'parent', 'student');

-- Create Users Table
create table public.users (
  id uuid references auth.users(id) on delete cascade not null primary key,
  role user_role not null default 'student'::user_role,
  first_name text,
  last_name text,
  email text,
  avatar_url text,
  school_name text,
  grade_level text,
  birthdate date,
  target_high_school text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security (RLS)
alter table public.users enable row level security;

-- Policies for Users Table

-- 1. Users can view their own profile
create policy "Users can view own profile."
  on public.users for select
  using ( auth.uid() = id );

-- 2. Users can update their own profile
create policy "Users can update own profile."
  on public.users for update
  using ( auth.uid() = id );

-- 3. Admins can view all profiles
create policy "Admins can view all profiles."
  on public.users for select
  using ( 
    exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

-- Function to handle new user signups
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

-- Trigger to automatically create a profile when a new auth user signs up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger for updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger handle_users_updated_at
  before update on public.users
  for each row execute procedure public.handle_updated_at();
