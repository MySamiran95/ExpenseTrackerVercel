-- Behaviour-report cadence: daily / weekly / bimonthly / monthly / off.
-- Personal vs family ledgers stay separate; this only picks how often
-- Keep surfaces a digest on Home and Insights.
alter table user_profiles
  add column if not exists insight_cadence text not null default 'weekly';
