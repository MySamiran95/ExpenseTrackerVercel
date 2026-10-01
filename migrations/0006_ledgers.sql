-- Personal + family ledgers, trips, join requests, full vault fields.

drop index if exists household_members_user_idx;

alter table households
  add column if not exists kind text not null default 'family';

alter table user_profiles
  add column if not exists last_scope text not null default 'personal';
alter table user_profiles
  add column if not exists backup_cadence text not null default 'weekly';
alter table user_profiles
  add column if not exists last_backup_at timestamptz;

-- Existing households keep their ledger as the family view so history does not vanish.
update user_profiles
  set last_scope = 'family'
  where onboarding_done = true and last_scope = 'personal';

alter table identity_docs drop constraint if exists identity_docs_user_id_kind_key;
alter table identity_docs
  add column if not exists label text not null default '';
alter table identity_docs
  add column if not exists number_full text not null default '';

alter table payment_cards
  add column if not exists number_full text not null default '';
alter table payment_cards
  add column if not exists pin text not null default '';
alter table payment_cards
  add column if not exists cvv text not null default '';
alter table payment_cards
  add column if not exists notes text not null default '';

create table if not exists household_join_requests (
  id serial primary key,
  household_id integer not null references households (id) on delete cascade,
  user_id text not null,
  display_name text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create index if not exists household_join_requests_house_idx
  on household_join_requests (household_id, status);

create table if not exists trips (
  id serial primary key,
  household_id integer not null references households (id) on delete cascade,
  user_id text not null,
  name text not null,
  started_on date,
  ended_on date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists trips_household_idx on trips (household_id, created_at desc);

alter table expenses
  add column if not exists trip_id integer references trips (id) on delete set null;

create index if not exists expenses_trip_idx on expenses (trip_id);
