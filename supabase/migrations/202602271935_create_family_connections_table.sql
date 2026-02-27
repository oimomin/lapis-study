-- Create Family Connections Table
create table public.family_connections (
  id uuid default uuid_generate_v4() primary key,
  parent_id uuid not null references public.users(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- ensure a parent-student pair is unique
  unique(parent_id, student_id)
);

-- Turn on Row Level Security (RLS)
alter table public.family_connections enable row level security;

-- Policies for Family Connections Table

-- 1. Parents can view their own connections
create policy "Parents can view their own connections."
  on public.family_connections for select
  using ( auth.uid() = parent_id );

-- 2. Students can view their own connections
create policy "Students can view their own connections."
  on public.family_connections for select
  using ( auth.uid() = student_id );

-- 3. Admins can view all connections
create policy "Admins can view all family connections."
  on public.family_connections for select
  using ( 
    exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

-- 4. Admins can insert/update/delete connections
create policy "Admins manage all family connections."
  on public.family_connections for all
  using ( 
    exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );
