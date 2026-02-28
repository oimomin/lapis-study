-- Create contract_status Enum
create type contract_status as enum ('pending', 'trial', 'annual', 'canceled');

-- Create contracts table
create table public.contracts (
  id uuid default gen_random_uuid() primary key,
  parent_id uuid references public.users(id) on delete cascade not null,
  student_id uuid references public.users(id) on delete cascade not null,
  contract_type contract_status not null,
  subjects text[] not null,
  monthly_fee integer not null,
  admission_fee integer not null default 0,
  system_fee integer not null default 1000,
  agreed_to_terms boolean not null default false,
  agreed_to_privacy boolean not null default false,
  parent_signature_name text not null,
  signed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text not null default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS
alter table public.contracts enable row level security;

-- Policies for contracts
-- Parents can view their own signed contracts
create policy "Parents can view their own contracts"
  on public.contracts for select
  using ( auth.uid() = parent_id );

-- Admins can view all contracts
create policy "Admins can view all contracts"
  on public.contracts for select
  using ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

-- Parents can create a contract
create policy "Parents can insert contracts"
  on public.contracts for insert
  with check ( auth.uid() = parent_id );

-- Admins can update contracts (e.g. to mark as canceled)
create policy "Admins can update contracts"
  on public.contracts for update
  using ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

-- Trigger for updated_at (reuses the existing function from users table)
create trigger handle_contracts_updated_at
  before update on public.contracts
  for each row execute procedure public.handle_updated_at();
