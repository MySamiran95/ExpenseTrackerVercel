-- Cached Grok coaching notes, keyed by household + a fingerprint of the ledger.
create table if not exists coach_advice (
  household_id integer primary key references households (id) on delete cascade,
  fingerprint text not null,
  narrative text not null default '',
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
