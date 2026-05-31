-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('cash_or_srs', 'cpfis');

-- CreateEnum
CREATE TYPE "Domicile" AS ENUM ('sgd', 'usd');

-- CreateEnum
CREATE TYPE "PremiumAllocationType" AS ENUM ('single', 'recurring', 'term');

-- CreateEnum
CREATE TYPE "TermEndBehaviour" AS ENUM ('stop', 'persist_last');

-- CreateEnum
CREATE TYPE "ChargeSchedule" AS ENUM ('perpetual', 'recurring', 'term', 'escalating_n');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('account_value', 'annual_premium', 'cumulative_premium_paid', 'notional_premium');

-- CreateEnum
CREATE TYPE "SurrenderFeeType" AS ENUM ('account_value', 'cumulative_premium_paid');

-- CreateTable
CREATE TABLE "policies" (
    "id" SERIAL NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "domicile" "Domicile" NOT NULL,
    "payment_term_years" INTEGER,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_account_fee_terms" (
    "id" SERIAL NOT NULL,
    "policy_account_fee_id" INTEGER NOT NULL,
    "policy_year" INTEGER NOT NULL,
    "charge_percentage" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "policy_account_fee_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_account_fees" (
    "id" SERIAL NOT NULL,
    "policy_id" INTEGER NOT NULL,
    "policy_account_id" INTEGER,
    "description" TEXT NOT NULL,
    "charge_schedule" "ChargeSchedule" NOT NULL,
    "active_from_policy_year" INTEGER NOT NULL,
    "term_end_behaviour" "TermEndBehaviour",
    "recurring_length" INTEGER,
    "fee_type" "FeeType" NOT NULL,
    "notional_percentage" DECIMAL(5,2),
    "is_percentage_available" BOOLEAN NOT NULL DEFAULT true,
    "charge_percentage" DECIMAL(5,2),
    "min_premium" INTEGER,
    "max_premium" INTEGER,

    CONSTRAINT "policy_account_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_account_premium_allocation_terms" (
    "id" SERIAL NOT NULL,
    "policy_account_id" INTEGER NOT NULL,
    "policy_year" INTEGER NOT NULL,
    "premium_charge_percentage" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "policy_account_premium_allocation_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_account_surrender_fee_terms" (
    "id" SERIAL NOT NULL,
    "policy_account_surrender_fee_id" INTEGER NOT NULL,
    "policy_year" INTEGER NOT NULL,
    "charge_percentage" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "policy_account_surrender_fee_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_account_surrender_fees" (
    "id" SERIAL NOT NULL,
    "policy_id" INTEGER NOT NULL,
    "policy_account_id" INTEGER,
    "term_end_behaviour" "TermEndBehaviour" NOT NULL,
    "fee_type" "SurrenderFeeType" NOT NULL,

    CONSTRAINT "policy_account_surrender_fee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_accounts" (
    "id" SERIAL NOT NULL,
    "policy_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "allocation_from_policy_year" INTEGER NOT NULL,
    "allocation_till_policy_year" INTEGER,
    "premium_charge_percentage" DECIMAL(5,2),
    "premium_allocation_type" "PremiumAllocationType" NOT NULL,
    "term_end_behaviour" "TermEndBehaviour",

    CONSTRAINT "policy_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "policies_provider_name_domicile_source_unique" ON "policies"("provider_id", "name", "domicile", "description", "source_type");

-- CreateIndex
CREATE UNIQUE INDEX "policy_account_fee_terms_unique" ON "policy_account_fee_terms"("policy_account_fee_id", "policy_year");

-- CreateIndex
CREATE UNIQUE INDEX "policy_account_premium_allocation_terms_unique" ON "policy_account_premium_allocation_terms"("policy_account_id", "policy_year");

-- CreateIndex
CREATE UNIQUE INDEX "policy_account_surrender_fee_terms_unique" ON "policy_account_surrender_fee_terms"("policy_account_surrender_fee_id", "policy_year");

-- CreateIndex
CREATE UNIQUE INDEX "policy_policy_account_unique" ON "policy_accounts"("id", "policy_id");

-- CreateIndex
CREATE UNIQUE INDEX "providers_name_key" ON "providers"("name");

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "policy_account_fee_terms" ADD CONSTRAINT "policy_account_fee_terms_policy_account_fee_id_fkey" FOREIGN KEY ("policy_account_fee_id") REFERENCES "policy_account_fees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "policy_account_fees" ADD CONSTRAINT "policy_account_fees_account_policy_fkey" FOREIGN KEY ("policy_account_id", "policy_id") REFERENCES "policy_accounts"("id", "policy_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "policy_account_fees" ADD CONSTRAINT "policy_account_fees_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "policy_account_premium_allocation_terms" ADD CONSTRAINT "policy_account_premium_allocation_terms_policy_account_id_fkey" FOREIGN KEY ("policy_account_id") REFERENCES "policy_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "policy_account_surrender_fee_terms" ADD CONSTRAINT "policy_account_surrender_fee__policy_account_surrender_fee_fkey" FOREIGN KEY ("policy_account_surrender_fee_id") REFERENCES "policy_account_surrender_fees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "policy_account_surrender_fees" ADD CONSTRAINT "policy_account_surrender_fee_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "policy_account_surrender_fees" ADD CONSTRAINT "policy_account_surrender_fees_policy_account_fk" FOREIGN KEY ("policy_account_id", "policy_id") REFERENCES "policy_accounts"("id", "policy_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "policy_accounts" ADD CONSTRAINT "policy_accounts_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Conditional CHECK constraints (not representable as enums)

-- recurring_length must be NOT NULL for 'recurring', must be NULL for 'term'/'perpetual', can be either for 'escalating_n'
ALTER TABLE "policy_account_fees" ADD CONSTRAINT "policy_account_fees_recurring_length_ck"
  CHECK (
    (charge_schedule = 'escalating_n') OR
    (charge_schedule = 'recurring' AND recurring_length IS NOT NULL) OR
    (charge_schedule IN ('term', 'perpetual') AND recurring_length IS NULL)
  );

-- notional_percentage required when fee_type is 'notional_premium', must be NULL otherwise
ALTER TABLE "policy_account_fees" ADD CONSTRAINT "policy_account_fees_notional_pct_ck"
  CHECK (
    (fee_type = 'notional_premium' AND notional_percentage IS NOT NULL) OR
    (fee_type != 'notional_premium' AND notional_percentage IS NULL)
  );

-- charge_percentage required when schedule is not 'term' and rate is available, must be NULL otherwise
ALTER TABLE "policy_account_fees" ADD CONSTRAINT "policy_account_fees_charge_pct_ck"
  CHECK (
    (charge_schedule != 'term' AND is_percentage_available = true AND charge_percentage IS NOT NULL) OR
    ((charge_schedule = 'term' OR is_percentage_available = false) AND charge_percentage IS NULL)
  );

-- premium_charge_percentage must be NULL when allocation type is 'term', NOT NULL otherwise
ALTER TABLE "policy_accounts" ADD CONSTRAINT "policy_accounts_premium_pct_ck"
  CHECK (
    (premium_allocation_type = 'term' AND premium_charge_percentage IS NULL) OR
    (premium_allocation_type != 'term' AND premium_charge_percentage IS NOT NULL)
  );

-- term_end_behaviour must be NULL for 'single'/'recurring', must be set for 'term'
ALTER TABLE "policy_accounts" ADD CONSTRAINT "policy_accounts_term_end_behaviour_ck"
  CHECK (
    (premium_allocation_type IN ('single', 'recurring') AND term_end_behaviour IS NULL) OR
    (premium_allocation_type = 'term' AND term_end_behaviour IS NOT NULL)
  );
