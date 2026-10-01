-- Keep — family expense tracker

create table if not exists user_profiles (
  user_id text primary key,
  display_name text not null default '',
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists households (
  id serial primary key,
  name text not null,
  invite_code text not null unique,
  owner_user_id text not null,
  monthly_limit numeric(14, 2) not null default 80000,
  created_at timestamptz not null default now()
);

create table if not exists household_members (
  id serial primary key,
  household_id integer not null references households (id) on delete cascade,
  user_id text not null,
  role text not null default 'member',
  display_name text not null default '',
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create unique index if not exists household_members_user_idx on household_members (user_id);

create table if not exists expenses (
  id serial primary key,
  household_id integer not null references households (id) on delete cascade,
  user_id text not null,
  occurred_on date not null,
  category text not null,
  subcategory text not null,
  subcategory_other text,
  for_whom text not null,
  for_whom_other text,
  from_whom text not null,
  from_whom_other text,
  payment_mode text not null,
  reason text not null default '',
  amount numeric(14, 2) not null,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists expenses_household_date_idx on expenses (household_id, occurred_on desc);
create index if not exists expenses_household_cat_idx on expenses (household_id, category);

create table if not exists investments (
  id serial primary key,
  household_id integer not null references households (id) on delete cascade,
  user_id text not null,
  invested_on date not null,
  kind text not null,
  subcategory text not null,
  subcategory_other text,
  name text not null default '',
  institution text not null default '',
  amount numeric(14, 2) not null,
  notes text not null default '',
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists investments_household_idx on investments (household_id, invested_on desc);

create table if not exists budgets (
  id serial primary key,
  household_id integer not null references households (id) on delete cascade,
  category text not null,
  month text not null default 'recurring',
  limit_amount numeric(14, 2) not null,
  unique (household_id, category, month)
);

create table if not exists notifications (
  id serial primary key,
  household_id integer not null references households (id) on delete cascade,
  user_id text,
  kind text not null,
  title text not null,
  body text not null,
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_household_idx on notifications (household_id, created_at desc);

create table if not exists monthly_reports (
  id serial primary key,
  household_id integer not null references households (id) on delete cascade,
  month text not null,
  total_spend numeric(14, 2) not null default 0,
  total_invest numeric(14, 2) not null default 0,
  top_category text,
  vs_previous numeric(8, 2),
  summary text not null default '',
  suggestions jsonb not null default '[]'::jsonb,
  breakdown jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (household_id, month)
);
