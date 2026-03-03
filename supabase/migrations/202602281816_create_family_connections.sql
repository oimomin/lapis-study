-- Create family_connections table
drop table if exists public.family_connections cascade;
create table public.family_connections (
  id uuid default gen_random_uuid() primary key,
  parent_id uuid references public.users(id) on delete cascade not null,
  student_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(parent_id, student_id)
);

-- Turn on RLS
alter table public.family_connections enable row level security;

-- Policies for family_connections
-- Parents can view their connections
create policy "Parents can view their family connections"
  on public.family_connections for select
  using ( auth.uid() = parent_id );

-- Students can view their connections
create policy "Students can view their family connections"
  on public.family_connections for select
  using ( auth.uid() = student_id );

-- Admins can view all connections
create policy "Admins can view all family connections"
  on public.family_connections for select
  using ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

-- Parents can create a connection
create policy "Parents can insert family connections"
  on public.family_connections for insert
  with check ( auth.uid() = parent_id );

-- Admins can insert connections
create policy "Admins can insert family connections"
  on public.family_connections for insert
  with check ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );
