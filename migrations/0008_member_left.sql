-- Keep former family members on the ledger for history, but drop them from live pickers.
alter table household_members
  add column if not exists left_at timestamptz;
