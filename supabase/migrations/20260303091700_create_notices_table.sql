-- Create notices table
create table public.notices (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    content text not null,
    target_audience text not null check (target_audience in ('all', 'students', 'parents')),
    is_published boolean default true,
    created_by uuid references public.users(id) not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Set up Row Level Security (RLS)
alter table public.notices enable row level security;

-- Policies for notices
-- Admins can do everything
create policy "Admins can manage all notices." on public.notices
    for all using (
        exists (
            select 1 from public.users
            where users.id = auth.uid() and users.role = 'admin'
        )
    );

-- Students can read notices if they are published and targeted to 'all' or 'students'
create policy "Students can view published notices targeted to them." on public.notices
    for select using (
        is_published = true 
        and (target_audience = 'all' or target_audience = 'students')
        and exists (
            select 1 from public.users
            where users.id = auth.uid() and users.role = 'student'
        )
    );

-- Parents can read notices if they are published and targeted to 'all' or 'parents'
create policy "Parents can view published notices targeted to them." on public.notices
    for select using (
        is_published = true 
        and (target_audience = 'all' or target_audience = 'parents')
        and exists (
            select 1 from public.users
            where users.id = auth.uid() and users.role = 'parent'
        )
    );

-- Create a helper function to automatically update the updated_at column
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to update updated_at on notices update
create trigger handle_notices_updated_at
  before update on public.notices
  for each row
  execute function public.handle_updated_at();
