
create table public.admin_otp_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);
create index admin_otp_codes_user_idx on public.admin_otp_codes (user_id, consumed_at, expires_at desc);

alter table public.admin_otp_codes enable row level security;

create policy "Admins view otp codes" on public.admin_otp_codes
  for select using (public.has_role(auth.uid(), 'admin'::public.app_role));

create table public.admin_mfa_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  method text not null check (method in ('totp','email')),
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  user_agent text,
  ip text
);
create index admin_mfa_grants_user_idx on public.admin_mfa_grants (user_id, expires_at desc);

alter table public.admin_mfa_grants enable row level security;

create policy "Admins view own grants" on public.admin_mfa_grants
  for select using (auth.uid() = user_id and public.has_role(auth.uid(), 'admin'::public.app_role));
