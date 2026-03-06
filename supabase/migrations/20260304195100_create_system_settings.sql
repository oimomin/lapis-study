-- Create system_settings table
create table public.system_settings (
  id integer primary key default 1,
  terms_content text not null default 'システム利用規約の本文が未設定です。',
  privacy_content text not null default '個人情報保護方針の本文が未設定です。',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure only one row can exist
alter table public.system_settings add constraint system_settings_single_row check (id = 1);

-- Turn on RLS
alter table public.system_settings enable row level security;

-- Policies for system_settings
-- Anyone authenticated can view settings (parents need to see it during contract)
create policy "Authenticated users can view system settings"
  on public.system_settings for select
  using ( auth.role() = 'authenticated' );

-- Admins can update settings
create policy "Admins can update system settings"
  on public.system_settings for update
  using ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );
create policy "Admins can insert system settings"
  on public.system_settings for insert
  with check ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

-- Insert the default single row
insert into public.system_settings (id) values (1) on conflict (id) do nothing;

-- Add snapshot columns to contracts table
alter table public.contracts add column terms_snapshot text;
alter table public.contracts add column privacy_snapshot text;
