-- Per-trip budget, separate from everyday category limits.

alter table trips
  add column if not exists budget_limit numeric(14, 2) not null default 0;
