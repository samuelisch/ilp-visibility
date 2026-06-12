-- rename policyAccountFee 'is_percentage_available' to 'is_fee_available'
ALTER TABLE "policy_account_fees"
RENAME COLUMN "is_percentage_available" TO "is_fee_available";

-- update flat fee rows in policies' 'is_fee_available' to true
UPDATE "policy_account_fees"
SET "is_fee_available" = TRUE
WHERE "flat_fee_amount" IS NOT NULL;

ALTER TABLE "policy_account_fees"
DROP CONSTRAINT "policy_account_fees_charge_pct_ck";

-- constraint, if 'is_fee_available' is false, 'charge_percentage' and 'flat_fee_amount' has to be NULL
-- when charge schedule is term, it doesn't apply since fee is available still but laid out in term
ALTER TABLE "policy_account_fees"
ADD CONSTRAINT "policy_account_fees_fee_availability_ck"
CHECK (
  "charge_schedule" = 'term'
  OR
  (
    ("is_fee_available" = FALSE
      AND "charge_percentage" IS NULL
      AND "flat_fee_amount" IS NULL)
    OR
    ("is_fee_available" = TRUE
      AND (
        ("charge_percentage" IS NOT NULL AND "flat_fee_amount" IS NULL)
        OR 
        ("charge_percentage" IS NULL AND "flat_fee_amount" IS NOT NULL)
      ))
  )
);