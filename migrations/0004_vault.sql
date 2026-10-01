-- Personal identity papers and payment cards. Scoped per user, never shared
-- across the household. Aadhaar stores only the last four digits.

create table if not exists identity_docs (
  id serial primary key,
  user_id text not null,
  household_id integer not null references households (id) on delete cascade,
  kind text not null,
  holder_name text not null default '',
  number_masked text not null default '',
  extra jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, kind)
);

create index if not exists identity_docs_user_idx on identity_docs (user_id);

create table if not exists payment_cards (
  id serial primary key,
  user_id text not null,
  household_id integer not null references households (id) on delete cascade,
  card_kind text not null,
  nickname text not null default '',
  bank text not null default '',
  network text not null default '',
  last4 text not null default '',
  expiry_month integer,
  expiry_year integer,
  credit_limit numeric(14, 2),
  holder_name text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists payment_cards_user_idx on payment_cards (user_id);
