# Architectural Decisions

Decisions made during development, in chronological order. Written for clarity, learning, and future reference.

---

## 001 — React frontend, NestJS backend

React (TypeScript) for the frontend, NestJS (TypeScript) for the backend. React is familiar territory, which keeps the frontend out of the way as a learning variable; NestJS is the deliberate learning surface — its opinionated structure (modules, controllers, services, DI, guards, pipes) surfaces backend conventions explicitly rather than leaving them to ad-hoc choices. TypeScript end-to-end so data-model types defined in the backend can be shared with the frontend without duplication or codegen.

---

## 002 — Python (pdfplumber) for extraction, TypeScript for the web layer

pdfplumber is the strongest tool for structured table extraction from text-based PDFs. The extraction script runs offline and outputs JSON — the JSON file is the boundary between the two languages. The web app never needs to know Python exists.

---

## 003 — Postgres as the v1 data layer — 2026-05-22

During entity design, the data model took a naturally relational shape: Provider → Policy → PolicyFee (with PolicyFeeTerms) + PolicySurrenderFee (with PolicySurrenderFeeTerms). Storing this as static JSON would require either an awkward nested format or a messy migration step. Postgres keeps the logical model consistent from the start — rows, FKs, and term tables map directly to the schema designed.

Consequences:
- Accessed via the NestJS data layer (ORM choice TBD — TypeORM, Prisma, or Kysely)
- Local dev runs Postgres via Docker Compose; production options stay open (managed Postgres on Render / Railway / Supabase, or self-hosted on a VPS)

---

## 004 — v1 illustration engine: monthly compute, annual display — 2026-05-24

The recurrence simulates each month: premium charges deducted off the top, remaining premium allocated to PolicyAccount(s), ACV grown at the selected investment return, then policy/account fees deducted from the post-growth ACV. Annual figures are snapshots at the 12-month boundary.

The monthly cadence matches how providers actually deduct fees (cancellation of units monthly across all 10 providers studied). The chosen order matches the dominant industry pattern: premium-side charges before allocation, AV-side charges after returns. Trade-off: outputs won't reconcile exactly with provider Benefit Illustrations (different rounding, mid-month deductions, charge-base nuances), but the divergence is small and the model is teachable.

---

## 005 — Investment return assumptions: 3% / 8% with a modest/ambitious selector — 2026-05-24

MAS-standard Investment Illustration Rates (3% Lower / 8% Higher) are used as the chart's projection bounds. The user picks "modest" or "ambitious" from a selector. Aligns with what consumers see on the policy illustrations they're already holding, so the chart and the document use the same anchor. Past 25–30 year historical fund returns are out of scope until sub-fund data is in v2/v3.

---

## 006 — Surrender chart shows rate and value, not just rate — 2026-05-24

Two surrender views: the published surrender charge rate by policy year, and the projected surrender value `ACV(N) × (1 − surrenderRate(N))` by policy year. The rate view gives transparency on the contractual deduction; the value view answers the user's real question ("what do I walk away with if I exit at year N?"). Both derive from the single ACV trajectory the engine already computes.

---

## 007 — Escalating-N fees stored as runtime definitions, not pre-computed schedules — 2026-05-24

The data model carries `chargeSchedule: "escalatingN"` on PolicyAccountFee and stores the formula parameters (rate + payment term). The frontend computes the monthly fee at render time: `(percentage / 12) × annualisedPremium × min(currentPolicyYear, Policy.paymentTerm)`. Covers Etiqa Formula C, FWD Horizon / Flexi VII, TML escalating Initial/Policy Charges, and HSBC AMF. Avoids materialising 20–30 PolicyAccountFeeTerm rows per such fee, and rate-parameter changes touch one row instead of many.

Requires the schema additions in 009.

---

## 008 — Schema extensions: paymentTerm, fromPolicyYear, premium bands — 2026-05-24

Three additions to the v1 schema, surfaced during the v1 scope stress test:

- `Policy.paymentTerm: number | null` — the premium payment term in years. Null for single-premium and perpetual products. Required for the escalating-N engine to apply the `min(year, PPT)` cap.
- `PolicyAccountFee.fromPolicyYear: number` — explicit start year for each fee row. Fees with a rate-phase change (e.g. Etiqa Formula A's in-PPT 2.30% then post-PPT sliding scale, or Formula C's 2.18% Y1–10 then 0.60% Y11+) are modelled as two rows that chain by `fromPolicyYear`, not by implicit `previousRow.recurringLength + 1` arithmetic.
- `PolicyAccountFee.minPremium: number | null` and `maxPremium: number | null` — for premium-band-dependent schedules (e.g. Manulife InvestReady III S$5/month tier, conditional on first-year annualised premium). v1 filters these products out at the UI level; the fields exist so v2 can enable band-aware fee selection without a schema migration.

---

## 009 — pnpm workspaces monorepo with shared root configs — 2026-05-27

Frontend (React + Vite) and backend (NestJS) live as workspaces under one repo (`/frontend`, `/backend`). The root holds **shared configuration files** — not shared dependencies. Each workspace declares the tools it actually uses; versions are aligned across packages so pnpm dedupes them via the lockfile and the content-addressable store at `node_modules/.pnpm/`.

Shared at root:
- `tsconfig.base.json` — language-level TS options; each workspace extends and adds environment-specific overrides (module, lib, jsx, decorators)
- `eslint.config.base.mjs` — JS + TS recommended rules; each workspace imports it and layers framework plugins (React for frontend, NestJS + type-checked rules + Prettier integration for backend)
- `prettier.config.mjs` + `.prettierignore` — single formatter config for the whole repo (Prettier walks up the tree, no per-package extends needed)
- Root `package.json` scripts: `pnpm lint / typecheck / build / test / format` fan out via `pnpm -r run X`

Per-workspace (NOT hoisted):
- Framework runtime deps (React, NestJS) and framework-specific tooling (Vite, Nest CLI, jest)
- Each workspace's own `eslint.config.*` and `tsconfig.*` extending the root base
- Shared tools (typescript, eslint, prettier) listed in each workspace's devDeps too — required for binary resolution under pnpm's strict isolation, deduped on disk via the `.pnpm/` store

Decision *not* taken: a `packages/shared/` workspace for FE/BE shared types. Deferred until there's actual data-model code worth sharing.

Trade-off accepted: declaration boilerplate (shared tools listed in multiple `package.json` files) in exchange for strict dependency isolation — each workspace can only import what it declared, preventing phantom deps.

---

## 010 — Raw SQL schema before ORM — 2026-05-29

The v1 data model was implemented as raw `CREATE TABLE` / `ALTER TABLE` statements in `psql` before choosing an ORM. Six tables created: `providers`, `policies`, `policy_accounts`, `policy_account_fees`, `policy_account_fee_terms`, `policy_account_surrender_fees`, `policy_account_surrender_fee_terms`.

Key implementation choices made during schema creation:

- **Integer auto-increment PKs** instead of the conceptual model's string PKs. Simpler for a local-first schema; UUIDs or string IDs can be adopted when the ORM layer is introduced if needed.
- **Composite FKs for dual-path integrity**: `policy_account_fees` and `policy_account_surrender_fees` use `FOREIGN KEY (policy_account_id, policy_id) REFERENCES policy_accounts(id, policy_id)` to prevent a fee row from referencing an account that belongs to a different policy. PostgreSQL skips the composite FK check when `policy_account_id` is NULL (policy-wide fees), so a standalone `policy_id → policies(id)` FK covers that path.
- **CHECK constraints enforce conditional nullability**: `charge_percentage` must be NULL when `charge_schedule = 'term'` or `is_percentage_available = false`; `recurring_length` is required for `recurring`, forbidden for `term`/`perpetual`, optional for `escalating_n`; `notional_percentage` is required only when `fee_type = 'notional_premium'`.
- **Unique constraints on term tables**: `(policy_account_fee_id, policy_year)` and `(policy_account_surrender_fee_id, policy_year)` prevent duplicate year entries.

Trade-off accepted: no migration files yet. The schema lives only in the local Postgres instance. Reproducible DDL scripts or ORM-managed migrations will be needed before the schema can be shared or deployed.

---

## 011 — Collapse SRS and Cash into a single sourceType — 2026-05-29

Cross-provider research (all 10 providers, ~75 products) confirmed that no provider charges different fees for SRS vs Cash funding. The only funding-source fee difference in the dataset is CPF vs non-CPF (0% premium charge for CPFIS on AIA Invest Easy, GE GIA, Prudential InvestGrowth, HSBC Wealth Invest). `Policy.source_type` was changed from `'cash' | 'srs' | 'cpfis'` to `'cash_or_srs' | 'cpfis'`, and `source_type` was added to the composite unique constraint on `policies`.

---

## 013 — Prisma model naming: uppercase singular with @map — 2026-06-09

Prisma models use TypeScript conventions (uppercase singular: `Policy`, `Provider`, `PolicyAccount`) while Postgres tables stay lowercase plural (`policies`, `providers`, `policy_accounts`). `@@map("table_name")` on models and `@map("column_name")` on fields bridge the two naming worlds. Fields are camelCase in Prisma (`providerId`, `paymentTermYears`) mapping to snake_case columns (`provider_id`, `payment_term_years`).

Relation fields (e.g. `policyAccounts PolicyAccount[]`) don't get `@map` — they're virtual Prisma properties with no underlying column. Only scalar fields that correspond to actual database columns need the mapping.

This is a Prisma-only change — no migration required since the underlying SQL is unchanged.

---

## 014 — Seed data via JSON files + Prisma seed script — 2026-06-09

Seed data lives in JSON files (raw data, no Prisma syntax), read by a TypeScript seed script that builds the Prisma `create` calls. This mirrors the future production flow: the LLM normalisation pipeline will output structured JSON, and an ingestion step will write it to the database. The seed script is a prototype of that ingestion step.

Uses `prisma.*.create()`, not `upsert`. The seed is designed to run once on a fresh database. If run against an already-seeded database, unique constraints will reject duplicates and the script will error — acceptable for v1. Idempotent seeding (upsert / find-or-create) deferred until there's a real re-run use case.

First seed target: AIA Elite Secure Income Single Pay (SP).

---

## 015 — feeType for single premium charges: cumulative_premium_paid, not annual_premium — 2026-06-10

For single premium products, fees calculated on the premium amount (e.g. AIA ESI SP Supplementary Charge: `Annual Rate / 12 × Single Premium`) use `feeType: "cumulative_premium_paid"`, not `"annual_premium"`.

`annual_premium` implies an annualised premium figure — a well-defined concept for regular premium products but ambiguous for single premium products. At year 2+, there is no premium being paid, so the annualised premium could be interpreted as $0 by the engine. `cumulative_premium_paid` sums all premiums paid to date, which for a single premium product equals the single premium every year — no special-casing needed.

`annual_premium` is reserved for regular premium products where the annualised premium is a fixed, unambiguous reference value.

---

## 016 — Global PrismaModule instead of per-module PrismaService registration — 2026-06-10

PrismaService was originally registered as a provider inside PolicyModule. As more feature modules are added, each would need to re-register PrismaService, creating multiple instances and duplicating wiring.

Moved to a dedicated `PrismaModule` with `@Global()` decorator, imported once in `AppModule`. PrismaService is declared in `providers` and `exports` — `@Global()` makes it injectable everywhere without explicit imports, but `exports` is still required to expose the provider outside the module. PolicyModule's `providers` array no longer includes PrismaService.

Trade-off: global modules reduce visibility into which modules depend on Prisma. Acceptable because every feature module in this app needs database access — the dependency is universal, not selective.

---

## 017 — Service-level unit tests alongside controller tests — 2026-06-10

Controller tests mock the service and verify HTTP routing + param pass-through. Service tests mock PrismaService and verify query construction (where clauses, include trees) and error handling (NotFoundException). Both test layers are necessary:

- Controller tests catch: wrong HTTP method, missing pipes, param not forwarded
- Service tests catch: wrong Prisma query shape, missing filters, wrong include nesting, null-check regressions

Convention: one spec file per class (`policy.controller.spec.ts`, `policy.service.spec.ts`), colocated with source. Matches NestJS CLI defaults.

---

## 018 — flatFeeAmount on PolicyAccountFee for flat-dollar charges — 2026-06-11

AIA Pro Lifetime Protector (II) charges a flat S$5/month Policy Fee — not a percentage of any base. The v1 schema only supported percentage-based fees via `chargePercentage`. Added a nullable `flatFeeAmount: Decimal(10, 2)` field to `PolicyAccountFee`. When set, the engine uses the flat dollar amount directly (monthly deduction = `flatFeeAmount`); when null, it uses `chargePercentage` as before.

The two fields are mutually exclusive in practice: a fee row uses either `chargePercentage` (percentage of some base per `feeType`) or `flatFeeAmount` (fixed dollar amount), never both. This is enforced by convention in the seed data, not by a database CHECK constraint — keeping the schema simple since only one AIA product uses flat fees today.

---

## 019 — AIA seed data: interpretation decisions and known limitations — 2026-06-11

Seeded all 16 AIA policy variants (15 new + 1 existing ESI SP). Three interpretation decisions made during seeding:

**PRE Regular Premium paymentTermYears = 5 (inferred).** The Product Summary doesn't explicitly state a limited payment term. Inferred from: premium charge drops to 0% from Year 4 (same pattern as ESI 5 Pay), supplementary charge runs 5 years, premium holiday charge stops after 5+ premiums paid.

**PWE 2.0 Administration Charge: assumed 26–30 entry age (0.24% p.a.).** The charge is age-banded (10 bands from 0.16% to 1.26%) and based on Insured Amount at Issue Date — neither the age-banding nor the "insured amount" base fits the v1 schema. Decision: use the 26–30 age band rate as the default, with `isPercentageAvailable: true` and `chargePercentage: 0.24`. Display layer will show an age-assumption disclaimer. Future: user-selectable age band or age input field.

**PWL Administration Charge: kept as isPercentageAvailable = false.** Rates are only in the policy illustration, not the Product Summary. Display layer shows a disclaimer. Future consideration: accept user-provided rates from their policy illustration and aggregate averages across users.

**APA 3.0 Supplementary Charge timing: policy years used as proxy for premiums paid.** The Product Summary defines the charge cessation trigger as "number of regular premiums paid" rather than calendar years. Under v1's assumption (all premiums paid on time, annual frequency), premiums-paid = policy-years, so `recurringLength` by policy year is correct.

---

## 012 — Premium charges modeled on PolicyAccount, not PolicyAccountFee — 2026-05-29

Premium charges (the upfront percentage deducted from each premium payment) are economically different from ongoing fees (which erode account value over time). Premium charges reduce what gets invested at the point of payment; ongoing fees are deducted monthly from the account value after growth. Placing both in `PolicyAccountFee` would force the engine to branch on `fee_type` to decide when to apply the charge — an implicit assumption that belongs in the data model, not the engine.

`PolicyAccount` now carries `premium_allocation_type` (`'single'` | `'recurring'` | `'term'`), `premium_charge_percentage` (flat rate, null for term), and `term_end_behaviour`. A new `policy_account_premium_allocation_terms` table stores year-by-year charge rates when the rate varies. This also replaces `recurrence` on `Policy` — the engine infers the payment pattern from the account-level allocation type.

Cross-provider research confirmed that time-varying premium charges appear exclusively on regular premium products (AIA: 5 products, GE: 1, HSBC: 1, NTUC: 1, Prudential: 1). All single premium and top-up charges are flat across the entire dataset.

---


## 020 — basic_sum_assured FeeType: user-supplied base, persona age conventions — 2026-06-11

GE Prestige Legacy Advantage charges a policy fee as a percentage of **basic sum assured** (first 5 policy years, entry-age-banded from 0.13% to 0.58% p.a.). Basic sum assured never appears in product summaries — it lives only in each customer's policy figures document — so the engine can never derive it from seeded data.

Added `basic_sum_assured` to the `FeeType` enum. Semantics: percentage of the basic sum assured **as at policy commencement** (a fixed, user-known figure). This is distinct from *net* sum assured, which is the base for insurance/mortality charges — those remain excluded from modeling entirely (they vary monthly with attained age, gender, smoker status, and underwriting class).

**Engine behavior when the base is unknown:** fees with `feeType = basic_sum_assured` are **excluded from fee computation** unless the user supplies their basic sum assured. The FE will provide an optional input for users who know their figure. This is the first fee type whose base is user-supplied rather than derivable — the precedent for any future input-dependent fee. Future direction: predict basic sum assured from premium size or aggregate verified user inputs.

**Persona age conventions for age-banded charges** (extends the 019 PWE 2.0 approach into a general rule): when a charge is age-banded, seed the band containing ages 20–30 (or 25–30); when an exact age assumption is needed, use 25. Applied here: PLA policy fee seeded at the 22–31 band — 0.18% p.a., `recurringLength: 5`. Also applied: GREAT Flexi Advantage premium charge seeded at 3.00% (the ≤75 ANB rate). Negotiable charges (Prestige Portfolio premium charge, wrap fee) are seeded at worst-case initial caps. Display layer will state the persona assumption.

## 021 — Prudential seed data: assurance-charge-as-fee, charge placement semantics, allocated-premium approximation — 2026-06-11

Seeded all 21 Prudential policy variants. Three interpretation decisions:

**PRULink InvestGrowth Assurance Charge (1.5% of premium) is modeled as a fee, not excluded.** The insurance-charge scope exclusion targets age/gender/smoker-banded mortality charges whose rates the engine cannot know. This charge is different: a flat, deterministic 1.5% of every premium (Cash/SRS policies only; CPF exempt). Excluding it would understate a knowable cost. Modeled per payment pattern: SP variant = one-off year-1 fee (`recurring`, length 1, `cumulative_premium_paid` per Decision 015); RSP variant = `perpetual` fee on `annual_premium`. The rule going forward: deterministic premium-based insurance costs are modeled as fees; rate-table mortality charges stay excluded.

**Charge placement encodes mechanics, not just base** (clarifies Decision 012): a deduction taken *before allocation* (buys fewer units) lives on `PolicyAccount.premiumChargePercentage` / allocation terms; a deduction taken *after allocation via unit cancellation* lives in `policyAccountFees`, whatever its `feeType` base. InvestGrowth Cash/SRS therefore carries both a 3% premium charge (pre-allocation) and the 1.5% assurance fee (unit cancellation) — economically 4.5% of premium, structurally two different events.

**PRUActive LinkGuard surrender base: `account_value` as the approximation for "sum of allocated premiums."** The PDF charges 100%/100%/50% (months 1-12/13-24/25-36 of premiums paid) on the sum of *allocated* premiums — premiums net of the 75%/55%/45% premium charges, a fixed base with no market drift. The schema has no allocated-premium base. `cumulative_premium_paid` (gross) would overstate the Y1 charge ~4x; `account_value` (= allocated premiums ± performance − fees) is within market-movement error over the 3-year charge window, so it is used. A future `allocated_premium` surrender-fee base would be exact, since the engine can derive it from the premium charge schedule.

Also ratified: month-keyed schedules (LinkGuard: months premiums paid; PRUVantage Assure (SP): months from cover start) map 1:1 to policy years under the on-time-payment assumption; PRUVantage Assure (SP)'s 100%/100.5%/101% premium-size credit is a bonus and not modeled; Growth/Flex accounts collapse into one account because all modeled charges apply identically to their combined value — the split only matters for excluded Welcome Bonuses, and `policyAccounts` supports splitting later if bonuses enter scope.

## 022 — HSBC seed data: fund-layer exclusion test, escalating-N cap workaround, Voyage post-MIP interpretation — 2026-06-11

Seeded all 16 HSBC Life variants. Decisions ratified:

**Fund-level charges are excluded by a fund-dependence test, uniformly across providers.** Wealth Invest's Management Charge (up to 1.20%/1.60% p.a., max 2.50%) is deducted from the sub-fund's NAV on valuation — economically it reduces account value like any fee, but its rate depends on fund selection and it sits in the same layer as Prudential's Continuing Investment Charge and GE's fund management/custodian fees, which are already excluded. Including it for one provider would skew cross-provider comparisons. The test: a charge whose rate depends on which funds the user picks, deducted inside unit pricing, is fund-layer and excluded in v1 — regardless of who sets it. The future sub-fund data layer is the home for this entire category, applied to every product at once. Consequence: both Wealth Invest files carry zero policy-level fees, which is truthful — this product's costs live in its funds.

**escalating_n is used only when the multiplier cap equals paymentTermYears** (Decision 007's formula). Goal Builder II's PAF fits (cap = premium term; modeled as two escalating_n fees: 2.50% years 1-8, 0.60% years 9-24). Wealth Focus (cap = Flexi Term 1/3/5, not the MIP-10 payment term) and Wealth Voyage (caps 12/16/19 via fixed final-years multipliers) do not fit — their AMFs are materialized as per-year `term` fee schedules of effective % of annual premium (rate x min(year, cap)). Exact, but bypasses 007's runtime-definition preference. If the pattern recurs (FWD and Etiqa findings suggest similar formulas), add a multiplier-cap field to PolicyAccountFee and fold these back into escalating_n.

**Wealth Voyage post-MIP AMF: multiplier = MIP (15/20/25% of annual premium p.a., perpetual).** The PDF's fixed-multiplier exceptions are scoped to "the last N policy years before the end of MIP", so after the MIP the general formula min(policy year, MIP) = MIP applies at the 1.00% post-MIP rate. Verified as the only coherent reading; no worked example exists in the PDF, making this the least-corroborated figure in the HSBC set. Sanity anchor: ~25% of AP at year 26 is roughly 1% of the account value accumulated by then — in line with peers' post-MIP fees of 0.60-1.00% of AV.

Also ratified: Wealth Invest Cash/SRS premium charge at the 5% distributor maximum (worst-case convention); Flexi Protector's 102% allocation from year 5 treated as an excluded bonus (premium charge schedule 80/60/45 then stop); Wealth Harvest paymentTermYears = null (its PDF references a Premium Payment Term but never quantifies it); paymentTermYears = MIP for Voyage/Focus/Abundance/Accelerate although premiums are payable for life (post-MIP premiums and their allocation are not modeled); Wealth Accelerate modeled with two policyAccounts (IUA years 1-4/1-5 per the 48/60-month ICP, AUA after) with the AMF on the IUA continuing past the allocation window per the PDF, and the IMF on the AUA from year 1 (vacuously zero while the AUA is empty).
