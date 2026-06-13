-- term_end_behaviour only applies to fees on a 'term' charge schedule.
-- For 'recurring' and 'escalating_n', the fee's life is bounded by recurring_length
-- (activeFromPolicyYear .. activeFromPolicyYear + recurring_length - 1) and stops after;
-- there is no distinct end behaviour to record, so any value there is meaningless.
-- Null those out first so the CHECK below applies cleanly to existing rows.
UPDATE "policy_account_fees"
SET "term_end_behaviour" = NULL
WHERE "charge_schedule" <> 'term';

-- Enforce going forward: term_end_behaviour is set if and only if the fee is term-scheduled.
ALTER TABLE "policy_account_fees"
ADD CONSTRAINT "policy_account_fees_charge_schedule_term_ck"
CHECK (
  (
    "charge_schedule" = 'term'
    AND
    "term_end_behaviour" IS NOT NULL
  )
  OR
  (
    "charge_schedule" <> 'term'
    AND
    "term_end_behaviour" IS NULL
  )
);
