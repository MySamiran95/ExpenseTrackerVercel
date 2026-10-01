-- Per-user appearance. localStorage is the device cache; this column is the
-- account copy so the choice comes back after sign-in on a new device.
alter table user_profiles
  add column if not exists theme text not null default 'light';
