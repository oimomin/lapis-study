-- Add ip_address column to contracts table
alter table public.contracts
add column ip_address text;
