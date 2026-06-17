# Architectural Decisions

Decisions made during development. The wide, reusable decisions are the foundational architecture/schema entries and the cross-cutting seed-data conventions (**027–030**: COI exclusion, scope exclusions, persona/worst-case/on-time rules, fee-modeling patterns). The per-provider seed entries (**019, 021–026**) hold only product-specific facts and reference those conventions rather than restating them. Written for clarity, learning, and future reference.

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

Decision _not_ taken: a `packages/shared/` workspace for FE/BE shared types. Deferred until there's actual data-model code worth sharing.

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

(Update 2026-06-12, Decision 031: a `cash` value was re-added — not to undo this collapse, but on a different axis. This decision collapses cash and SRS where both are _offered_ with identical fees; `cash` now marks products that offer cash _only_ and do not accept SRS, e.g. Income Insurance's VS/VA series. `cash_or_srs` continues to mean "cash and SRS both accepted.")

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

## 019 — AIA Singapore seed data — 2026-06-11

Seeded all 16 AIA variants (15 new + the existing ESI SP). Product-specific facts (cross-cutting conventions are in 027–030):

- **PRE Regular Premium paymentTermYears = 5 (inferred).** Not stated in the Product Summary; inferred from the premium charge dropping to 0% from Year 4 (the ESI 5-Pay pattern), the 5-year supplementary charge, and the premium-holiday charge stopping after 5+ premiums paid.
- **PWL Administration Charge: `isPercentageAvailable = false`.** Rates appear only in the policy illustration, not the Product Summary; the display layer shows a disclaimer. Future: accept user-supplied rates and aggregate.

(PWE 2.0's 26–30 age-band 0.24% p.a. and APA 3.0's premiums-paid-as-policy-year proxy are applications of the persona / on-time-payment conventions — Decision 029.)

---

## 012 — Premium charges modeled on PolicyAccount, not PolicyAccountFee — 2026-05-29

Premium charges (the upfront percentage deducted from each premium payment) are economically different from ongoing fees (which erode account value over time). Premium charges reduce what gets invested at the point of payment; ongoing fees are deducted monthly from the account value after growth. Placing both in `PolicyAccountFee` would force the engine to branch on `fee_type` to decide when to apply the charge — an implicit assumption that belongs in the data model, not the engine.

`PolicyAccount` now carries `premium_allocation_type` (`'single'` | `'recurring'` | `'term'`), `premium_charge_percentage` (flat rate, null for term), and `term_end_behaviour`. A new `policy_account_premium_allocation_terms` table stores year-by-year charge rates when the rate varies. This also replaces `recurrence` on `Policy` — the engine infers the payment pattern from the account-level allocation type.

Cross-provider research confirmed that time-varying premium charges appear exclusively on regular premium products (AIA: 5 products, GE: 1, HSBC: 1, NTUC: 1, Prudential: 1). All single premium and top-up charges are flat across the entire dataset.

---

## 020 — basic_sum_assured FeeType: user-supplied base, persona age conventions — 2026-06-11

GE Prestige Legacy Advantage charges a policy fee as a percentage of **basic sum assured** (first 5 policy years, entry-age-banded from 0.13% to 0.58% p.a.). Basic sum assured never appears in product summaries — it lives only in each customer's policy figures document — so the engine can never derive it from seeded data.

Added `basic_sum_assured` to the `FeeType` enum. Semantics: percentage of the basic sum assured **as at policy commencement** (a fixed, user-known figure). This is distinct from _net_ sum assured, which is the base for insurance/mortality charges — those remain excluded from modeling entirely (they vary monthly with attained age, gender, smoker status, and underwriting class).

**Engine behavior when the base is unknown:** fees with `feeType = basic_sum_assured` are **excluded from fee computation** unless the user supplies their basic sum assured. The FE will provide an optional input for users who know their figure. This is the first fee type whose base is user-supplied rather than derivable — the precedent for any future input-dependent fee. Future direction: predict basic sum assured from premium size or aggregate verified user inputs.

GE Prestige Legacy Advantage's policy fee (age-banded) and GREAT Flexi Advantage's premium charge, plus the worst-case treatment of Prestige Portfolio's negotiable premium charge/wrap fee, established the **persona age-band and worst-case conventions now consolidated in Decision 029** (PLA → 22–31 band 0.18% p.a. `recurringLength: 5`; GREAT → 3.00% at ≤75 ANB).

## 021 — Prudential Assurance Singapore seed data — 2026-06-11

Seeded all 21 Prudential variants. This provider established three conventions now centralized in **Decision 030**: deterministic-premium-charge-as-fee (PRULink InvestGrowth's flat 1.5% Assurance Charge — Cash/SRS only, CPF exempt — modeled as a fee, not excluded as mortality; SP = one-off Y1 `recurring` length-1 on `cumulative_premium_paid`, RSP = `perpetual` on `annual_premium`), charge-placement mechanics (InvestGrowth carries both a 3% pre-allocation premium charge and the 1.5% unit-cancellation fee = 4.5% economically, two structural events), and allocated-premium ≈ `account_value` (PRUActive LinkGuard's 100/100/50% surrender on _allocated_ premiums; gross `cumulative_premium_paid` would overstate Y1 ~4×, `account_value` is within market-drift error over the 3-year window). Product-specific residue: PRUVantage Assure (SP) month-keyed schedule maps 1:1 to policy years under on-time payment (Decision 029); its 100/100.5/101% premium-size credit is an excluded bonus (Decision 028); Growth and Flex accounts collapse to one (all modeled charges apply identically to the combined value — the split only matters for excluded Welcome Bonuses; `policyAccounts` supports re-splitting if bonuses enter scope).

## 022 — HSBC Life Singapore seed data — 2026-06-11

Seeded all 16 HSBC Life variants. Established the **fund-layer exclusion test** (Decision 028, via Wealth Invest's NAV-deducted Management Charge → both Wealth Invest files carry zero policy-level fees, truthfully) and the **escalating_n-only-when-cap=paymentTermYears** rule with its term-materialization fallback (Decision 030: Goal Builder II's PAF fits — two escalating_n fees, 2.50% years 1–8, 0.60% years 9–24; Wealth Focus (cap = Flexi Term) and Wealth Voyage (caps 12/16/19) don't, so their AMFs are materialized as per-year `term` schedules of effective % of annual premium). Product-specific facts:

- **Wealth Voyage post-MIP AMF: multiplier = MIP** (15/20/25% of annual premium p.a., perpetual, at the 1.00% post-MIP rate). The PDF's fixed-multiplier exceptions are scoped to the last N years _before_ MIP end, so after the MIP min(year, MIP) = MIP. No worked example exists — the least-corroborated figure in the HSBC set; sanity-anchored at ~25% of AP ≈ ~1% of accumulated AV by year 26, in line with peers' 0.60–1.00%.
- **Wealth Accelerate two-account model** (IUA years 1–4/1–5 per the 48/60-month ICP, AUA after; the AMF on the IUA continues past the allocation window per the PDF, the IMF on the AUA from year 1 — vacuously zero while the AUA is empty). Wealth Harvest paymentTermYears = null (PDF references but never quantifies a PPT). Wealth Invest Cash/SRS premium charge at the 5% distributor max (worst-case, Decision 029); Flexi Protector's 102%-from-year-5 allocation is an excluded bonus (Decision 028).

## 023 — Singapore Life seed data — 2026-06-11

Seeded all 10 Singlife variants (Legacy Invest SP/3Y/5Y/10Y; Savvy Invest II 3/5/10-Year Fixed, 5/10/20-Year Flexible). Both mapping and verification agents extracted cleanly — zero numeric discrepancies. **Legacy Invest is the motivating product for a future bonus entity** (Decision 028): its four deterministic, disclosed bonuses (Welcome / Special Booster / Loyalty / Maturity) are excluded, and they're unusually large because they offset a steep front-loaded 3.0–3.5% p.a. Administrative Charge (the product's only modeled fee), so its modeled net cost is overstated more than any peer's. Product-specific facts: Savvy Invest II 20-Year Flexible's 102% allocation in years 11–20 is an excluded bonus allocation (Decision 028; only this variant has a >100% phase inside its modeled window); its Supplementary Charge (1.90% p.a. of AV) runs a fixed 10 policy years regardless of the 3F/5F payment term; Legacy Invest has no COI (death cover via the 101%-of-premiums floor); the year-7→8 surrender drop (40%→20%) in both 10-year Savvy columns is genuine, not an extraction error.

## 024 — FWD Singapore seed data — 2026-06-11

Seeded all 16 FWD variants across 6 families (Invest First Horizon 20/25Y; Invest Flexi VII; Invest First Summit PPT 10/15/20/25/30; Invest Flexi Elite 3/5-flexi; Invest Goal 1 SP; Invest First Max PPT 10/15/20/25/30). Both fan-outs found zero numeric discrepancies (First Max's merged staircase grid and the 21-column Appendix A verified at word-coordinate level + page images). Established the **min()-fee chaining** convention (Decision 030, via Summit's `lower of 1.5%×AUA or 0.7%×PPT×annualised-premium`; crossover year K = 7/8/10/12/14 for PPT 10/15/20/25/30) and the **single-account vs IUA/AUA route-of-premiums test** (Decision 030: Horizon/Flexi VII/Flexi Elite route all regular premiums to one account so the AUA is omitted; Summit/First Max have a genuine 24-month IUA→AUA split). Product-specific facts:

- **Quinquennial PPT sampling**: Summit and First Max offer every integer PPT 10–30 (21 columns); seeded 10/15/20/25/30 only (5 files/family).
- **Flexi VII MIT = 10 (inferred)** — surrender window (1–10), redemption window (3–10), and Loyalty Bonus from year 11 converge; **Flexi Elite paymentTermYears = 10 = the MIT, not the flexi number** (the explicit-MIT resolution of the flexi≠PPT rule, Decision 030).
- Horizon and Flexi VII are the first real `escalating_n` uses (PDF's "N = policy year during PPT/MIT, then N = PPT/MIT" = the engine's min(year, term)); Horizon's rate-phase boundary is asymmetric across variants (PPT 20: 3.8%→1.2% at year 10; PPT 25: 3.5%→1.0% at year 11). Goal 1's surrender base is the single premium (`cumulative_premium_paid`) and its unit-count initial charge ((1%/12)×units) ≡ 1% of AV. Summit and First Max share byte-identical Appendix A surrender tables. Recurring single premium (First Max) and premium-increase layers excluded (Decision 028); Horizon's large Booster package means its modeled net cost is overstated more than most.

## 025 — Etiqa Insurance seed data — 2026-06-11

Seeded 31 Etiqa variants across 11 families (smart flex II, Smart Vista, flex wealth II, Wealth Purpose, vista, flex prime II, flex pro, Prime Purpose, Invest starter, Invest plus SP, Tiq Invest). All verified clean by independent re-extraction. Etiqa's Formula A and Formula C originally motivated `cumulative_premium_paid` (008) and `escalating_n` (007); both landed as designed. Product-specific facts:

- **Shariah/Takaful twins (Smart Vista, vista, Prime Purpose, Wealth Purpose) are numerically identical to their conventional siblings** — the Takaful sections only rename charges (insurance charge → Tabarru', shortfall → Gharamah; Wakalah is the agency principle, not a fee).
- **Formula C flexi variants: paymentTermYears = 10** (PDF names the term "ten (10) Years – Flexi 3/5"; the flexi number is only the premium-free entitlement) — the explicit-PPT resolution of the flexi≠PPT rule (Decision 030), opposite to FWD Flexi Elite. **Formula A post-PPT sliding scale collapses to 0.60% perpetual** under on-time payment (the scale is indexed by #premiums-paid; exactly PPT premiums selects the bottom rate; a missed history would lock higher, up to 1.34% — Decision 029). flex wealth II / Wealth Purpose 3Y & 5Y: 2.60% p.a. of cumulative premiums is genuinely perpetual (coordinate-verified single-row tables, no step-down). Invest starter paymentTermYears = null — whole-life regular premium with no selectable term; its 5-year surrender charge (7/7/6/6/5% of AV) is the only lock-in (Decision 030). Invest plus SP Representative Management Charge at the 0.75% cap (Decision 029); its surrender base is `account_value`.
- **Dash PET Plus dropped, Tiq Invest kept** (fee-identical twins): Dash PET Plus is a yearly-renewable rider under a group policy the user doesn't own (SingCash Pte. Ltd.), coupled to a Basic policy whose fees sit outside its summary, with schema-unrepresentable S$100/S$1,000,000 account-value bounds and a Singtel Dash channel announced for 2025 wind-down — it adds no fee information, so the file was deleted. Tiq Invest is a standalone plan (the research findings mislabeled it a rider). Etiqa's separate Top-up Accounts and the Start-up Bonus Recovery clawback are excluded (Decision 028).

## 026 — Manulife Singapore seed data — 2026-06-11 (re-verified 2026-06-12)

Seeded 17 Manulife variants across 6 families (Manulink Investor (II) SP Cash/SRS + CPF; ManuInvest Duo MIP 10/15/20; InvestReady (III) SGD ×6 MIPs; InvestReady Growth MIP 15/20; SmartRetire (V) Income & Sum, MIP 8/12). Mapped by per-product fan-out; a targeted PDF re-verification fan-out (one agent per PDF) ran 2026-06-12 and confirmed the IR III 5Y-Flexi4 (100/100/75/40/20) and 7Y-Flexi5 (100/100/77/40/20/10/5) surrender tables, the InvestReady Growth notional/freeze reading, and the SmartRetire Flexi semantics. Provider legal name: Manulife (Singapore) Pte. Ltd. Product-specific facts:

- **First `notional_premium` use — InvestReady Growth.** Admin Charge = `X%/12 × Value of Minimum Premium Payable` (annualised regular premiums payable to the Flexi Start Date, accumulated at **6% p.a.** over the MIP — deterministic, market-independent). `feeType: notional_premium`, `notionalPercentage: 6.00`, `chargePercentage` = admin rate (15Y 2.18%→0.95%; 20Y 1.80%→0.92%). Two ratified semantics, the precedent for this feeType: post-MIP stays on the notional base (one formula, only X% swaps), and the base **freezes** at its MIP-end value (no further 6% compounding). The engine must "accumulate-to-Flexi-Start at 6%, then hold." (Pattern catalogued in Decision 030.)
- **InvestReady (III): two same-named summaries.** WA*MIRP (SGD-only) and WA_MIR03 (multi-currency) share the name; overlapping SGD variants are byte-identical. Seeded the full SGD lineup (6 MIPs), including 5Y Flexi1 (surrender 15/12/9/6/3 — unusually gentle, tied to its S$25k min premium; the only IR III plan not starting at 100%) and 6Y Flexi2 (100/100/77/40/20/10), which exist only in WA_MIR03 but are SGD-available there. Only the USD \_denominations* are deferred (v1 SGD-only). Post-MIP admin rate keyed to MIP length (5/6/7Y → 1.00%; 10/13Y → 0.70%). Future: a multi-currency `domicile` representation.
- **Conditional S$5/month policy fee (IR III 10Y & 13Y) kept out** — charged only when 1st-year annualised premium is in band (S$6,000–9,599 for 10Y; S$3,600–9,599 for 13Y), S$0 above ~S$9,600. Reinstate as a `flatFeeAmount` row with `minPremium`/`maxPremium` (Decision 008) when premium-band UI exists.
- **SmartRetire (V) Income and Sum both kept** — fee-identical (admin 2.50%→0.75% at year 6; same surrender per MIP), differing only in payout mechanic; two distinct retail products. 8Y Flexi3 vs Flexi5 differ only in the excluded premium-shortfall window, so each MIP collapses to one file (as does IR III 10Y Flexi3/5/8).
- **Manulink Investor (II): zero ongoing fees.** 3% premium charge (Cash/SRS), no admin/surrender/COI. The `cpfis` variant is 0% premium charge — confirmed 2026-06-12: the premium-charge table is scoped to the "Cash / SRS" plan line, so the 3% doesn't reach CPF; encoded as `premiumChargePercentage: 0.0` with empty fee arrays (a 0% charge is the absence of a fee).
- paymentTermYears = MIP, but the admin-tier step keys to a fixed year 6 for Duo & SmartRetire regardless of MIP (own `recurringLength`) — Decision 030. ManuInvest Duo's 5.0% p.a. Years 1–5 admin is the highest in the dataset.

## 027 — Cost of Insurance (NAAR-based mortality charges) excluded in v1; extraction reference for future inclusion — 2026-06-12

Cost of Insurance (COI) — the rate-table mortality/morbidity charge most regular-premium ILPs levy monthly — is **excluded from v1 across all providers**. This consolidates the per-provider inline exclusions (Manulife 026, and the earlier providers) into one referenceable decision, because COI is the single largest fee category we are _not_ modeling and the most likely future addition.

**Why excluded (three reasons, in order of weight):**

1. **Schema gap.** COI is charged on the **Net Amount At Risk (NAAR) = death-benefit floor − account value**, floored at 0. No `feeType` represents that — every existing base (`account_value`, `annual_premium`, `cumulative_premium_paid`, `notional_premium`, `basic_sum_assured`) is a single quantity, whereas NAAR is a _difference_ that depends on the engine's own projected account value each period. It cannot be expressed as a static seed-data fee row.
2. **Age-indexed rate.** The COI rate rises with the life-insured's **attained age**, so even a fixed persona pays a year-by-year escalating rate — it would need a `term` schedule keyed to the persona's starting age, not a flat rate.
3. **Marginal for the persona.** For the ratified persona (**male, 25yo, non-smoker** — the agreed COI mapping persona), COI is small and often self-extinguishing: where the death-benefit floor ≈ 101% of premiums (InvestReady III, InvestReady Growth), NAAR → 0 as the account value grows past premiums paid, and the age-25 rate is ~0.064% of NAAR/yr. SmartRetire's death COI is fully **refunded** at Target Retirement Age if no claim (moot for a hold-to-retirement persona).

**What future inclusion would require:** (a) a new `net_amount_at_risk` feeType (or engine special-case); (b) a per-product **death-benefit-floor** definition (101%/105% of premiums, or a user-supplied `basic_sum_assured`); (c) an age-indexed `term` fee schedule (policy year 1 = persona age-25 rate, year 2 = age-26, …); (d) engine logic computing `max(0, floor − AV) × rate/1000/12` monthly.

**Extraction reference (Manulife, 2026-06-12 — male non-smoker, guaranteed annual rate per S$1,000 NAAR; monthly = annual/12):**

- **InvestReady III & InvestReady Growth** (shared table, Appendix A): NAAR = 101% × (regular basic premiums + top-ups − withdrawals) − AV. Rates: age 25 = 0.64 (flat 17–35), 40 = 0.953, 45 = 1.344, 50 = 2.182, 55 = 3.987, 60 = 6.673, 65 = 11.62.
- **ManuInvest Duo** (Appendix B): NAAR = (sum insured − partial withdrawals) − AV. Rates: age 25 = 0.768 (flat to 35), 40 = 1.1436, 50 = 2.6184, 55 = 4.7844, 60 = 8.0076, 65 = 13.944.
- **SmartRetire (V)** — two COI lines (Appendix B): (1) **Death** COI, NAAR phase-dependent (during MIP = 105% × premiums − AV; accumulation = basic sum insured − withdrawals − AV; nil after Target Retirement Age), age 25 = 1.6552; (2) **Waiver-of-Premium-on-TPD** COI, NAAR = remaining basic premiums to Flexi Start Date capped at S$1,000,000, age 25 = 1.490, table runs only to age 69. Death COI refunded at Target Retirement Age if no death/WOP claim.
- **Manulink Investor (II):** no COI at all (single-premium product).

**Extraction reference (Income Insurance / NTUC, 2026-06-12 — male, per S$1,000 sum-at-risk/yr; monthly = annual/12):**

- **AstraLink (VA2):** NAAR = basic benefit − policy value, charged from year 1 (death + TI + TPD). Male non-smoker: age 25 = 1.00, 40 = 1.26, 65 = 15.05. (Highest NTUC rates — smoker/gender table.)
- **Legacy Flex Solitaire (VA3):** NAAR = adjusted sum assured − policy value, from year 1 (death + TI). Male non-smoker: age 25 = 0.23, 40 = 0.36, 65 = 4.12. (Notably lower than VA2.)
- **Invest Flex VS1 / VS2 / VS3:** NAAR = 101% × net premiums paid − policy value, charged only from the **3rd policy anniversary** (no smoker distinction — gender + age only). Male: age 25 = 0.49, 40 = 0.79, 65 = 11.74.
- **WealthLink (GL3), SNACK-Investment:** no COI (GL3 explicitly waives the insurance cover charge; SNACK has only an accidental-death feature, no mortality charge).

**Extraction reference (Tokio Marine Life, 2026-06-12 — male, per S$1,000 sum-at-risk; monthly = annual/12, age next birthday):** the Monthly Protection Charge (MPC) is optional on most products (only levied if the Advanced/Enhanced Death Benefit is selected), mandatory on #goClassic Secure / #goElite Secure, and uses **the same rate for smoker and non-smoker** (single male/female table). NAAR = `Net Premium − 101% × account value` (or `− 101% × policy value` for dual-account), floored at 0. Most products share one Death table: age 25 = **0.04900**, 40 = **0.06550**, 65 = **0.83720**. **#goAssure** (the only product with TPD) has its own guaranteed tables: Death 25/40/65 = 0.0529/0.0692/0.8795, and a separate TPD table 25/40/65 = 0.0087/0.0113/0.2509. Four products defer the MPC (accrue early years, deduct as a lump sum in Y3 or Y4: Affluence@Future, Harvest/Wealth Max, Wealth Pro II).

When COI enters scope, start from these tables and the four build requirements above.

---

## 028 — Seed-data scope exclusions, uniform across all providers — 2026-06-11 (consolidated 2026-06-12)

Categories excluded from v1 seed data the same way for every provider. Stated once here; per-provider entries reference this rather than re-deriving it.

- **Bonuses — all types, excluded.** Welcome, Special Booster, Loyalty, Maturity, Annual Premium, Contribution, Perpetual, Accumulation, Step-up Booster, Start-up, Power-up, Policy Charge Refund, promotional credits, premium-size credits (PRUVantage Assure 100/100.5/101%), and >100% premium allocations treated as bonus allocations (HSBC Flexi Protector 102% from year 5; Singlife Savvy Invest II 102% years 11–20). The schema has no bonus entity. Consequence: bonus-heavy products' modeled net cost is overstated — **Singlife Legacy Invest is the motivating product** for a future bonus entity (its package offsets a steep front-loaded admin charge), FWD Horizon next.
- **Fund-layer / sub-fund charges — excluded by a fund-dependence test.** Any charge whose rate depends on which funds the user picks, deducted inside unit pricing / NAV, is fund-layer regardless of who sets it (HSBC Wealth Invest Management Charge up to 1.2/1.6%; Prudential Continuing Investment Charge; GE fund management/custodian; Etiqa/Manulife sub-fund management). Home is the future sub-fund data layer, applied to every product at once. Consequence: products whose only costs are fund-layer (e.g. Wealth Invest) carry zero policy-level fees — truthful.
- **Cost of Insurance / rate-table mortality — excluded.** → Decision 027 (with extraction reference for future inclusion).
- **Partial withdrawals & flexibility/life-stage-waiver tiers** — out of scope.
- **Top-ups & separate top-up accounts** — 0%-charge, top-up-only inflows omitted (Etiqa Top-up Accounts; FWD recurring single premium = top-up-equivalent; AUAs whose only inflow is top-ups).
- **Premium shortfall / premium holiday charges** — missed-premium trigger, excluded under the on-time-payment assumption (Decision 029), including refundable variants (InvestReady Growth).
- **Premium increases/decreases & premium-increase layers** — not modeled (FWD layers; Etiqa Start-up Bonus Recovery clawback on decrease).
- **De-minimis fixed fees & currently-nil fees** — e.g. Manulife S$100 change-of-life-insured; free unlimited fund switching.

## 029 — Persona, worst-case, and on-time-payment conventions — 2026-06-11 (consolidated 2026-06-12)

How under-specified or assumption-dependent charges are pinned to a single modeled value. Display layer states the assumption.

- **Age-banded charges → seed the band containing ages 20–30 (exact age → 25).** Applications: AIA PWE 2.0 → 26–30 band, 0.24% p.a.; AIA APA 3.0 timing uses premiums-paid = policy-year; GE PLA policy fee → 22–31 band, 0.18% p.a. (`recurringLength: 5`); GE GREAT Flexi Advantage premium charge → 3.00% (≤75 ANB). COI persona is male / 25 / non-smoker (Decision 027).
- **Negotiable or capped charges → seed the worst-case initial cap** (effectively 0 if never agreed, but worst-case is modeled). GE Prestige Portfolio premium charge & wrap fee; HSBC Wealth Invest premium charge at 5% distributor max; Etiqa Invest plus SP Representative Management Charge at 0.75% cap.
- **Premiums are always paid on time, annually.** So premiums-paid = policy-year: month-keyed schedules map 1:1 to policy years (Prudential LinkGuard months-premiums-paid, PRUVantage Assure SP months-from-cover-start). Sliding scales indexed by number-of-premiums-paid select the on-time landing: Etiqa Formula A post-PPT → 0.60% (the bottom rate at exactly PPT premiums; a missed history would lock higher, up to 1.34% — not modeled).

## 030 — Fee-modeling patterns & schema workarounds — 2026-06-11 (consolidated 2026-06-12)

Reusable structural decisions for fees the v1 schema can't express directly. Each was first established by the cited product and applies dataset-wide.

- **Premium-charge placement encodes mechanics, not just base** (clarifies Decision 012). Pre-allocation deduction (buys fewer units) → `PolicyAccount.premiumChargePercentage` / allocation terms; post-allocation deduction via unit cancellation → `policyAccountFees`, whatever the `feeType`. Prudential InvestGrowth carries both (3% pre-allocation + 1.5% unit-cancellation = 4.5% economically, two events).
- **Deterministic premium-based insurance charges are modeled as fees, not excluded** (the insurance exclusion targets rate-table mortality only). InvestGrowth Assurance Charge (flat 1.5% of premium): SP = one-off Y1 `recurring` length-1 on `cumulative_premium_paid`; RSP = `perpetual` on `annual_premium`.
- **`escalating_n` only when the multiplier cap = paymentTermYears** (Decision 007's formula); otherwise materialize as a per-year `term` schedule of effective % of annual premium. Fits Etiqa Formula C, FWD Horizon/Flexi VII, HSBC Goal Builder II. Doesn't fit HSBC Wealth Focus (cap = Flexi Term) or Wealth Voyage (caps 12/16/19) → materialized as `term`. If the pattern recurs, add a multiplier-cap field and fold back.
- **min()-of-two-bases fees → two chained rows switching base at a frozen crossover year K** (no schema `min()`). FWD Summit: row 1 = 1.5% `account_value` years 1..K−1; row 2 = (0.7×PPT)% of `annual_premium` perpetual from K; K = midpoint of the 3%/8% crossover = 7/8/10/12/14 for PPT 10/15/20/25/30. Error confined to ~2 years where the legs are nearly equal.
- **Allocated-premium base ≈ `account_value`** (no allocated-premium base exists). Prudential LinkGuard surrender on allocated premiums → `account_value` (within market-drift error over the 3-year window; gross `cumulative_premium_paid` would overstate Y1 ~4×). A future `allocated_premium` base would be exact.
- **`notional_premium` base** (Manulife InvestReady Growth, Decision 026): admin = X%/12 × a deterministic notional accumulation of premiums (6% p.a. over the MIP). Post-MIP stays on the notional base; the base freezes at MIP-end.
- **paymentTermYears = MIP for whole-life-premium products** (the surrender-charge window defines the MIP; post-MIP premiums/allocation aren't modeled). **= null when there is no committed term at all** (Etiqa Invest starter; HSBC Wealth Harvest's unquantified PPT). An admin-tier step may key to a fixed policy year rather than the MIP (Manulife Duo & SmartRetire step at year 6 regardless of MIP) → its own `recurringLength`.
- **Flexi number ≠ paymentTermYears — resolved by what the PDF explicitly names.** Etiqa "10 Years – Flexi 3/5" → PPT = 10 (flexi = premium-free entitlement); FWD Flexi Elite → PPT = MIT = 10 (flexi = shortfall window). Opposite landings, one rule.
- **Single-account vs IUA/AUA: route-of-premiums test.** Two accounts only when premiums genuinely route to different accounts over time (HSBC Wealth Accelerate IUA→AUA; FWD Summit/First Max 24-month split); single account when all regular premiums route to one (FWD Horizon/Flexi VII/Flexi Elite — AUA omitted). Collapse accounts when all modeled charges apply identically to the combined value (Prudential Growth/Flex).

## 031 — Income Insurance (NTUC Income) seed data; `cash` sourceType for cash-only products — 2026-06-12

Seeded 18 Income Insurance variants across 7 families (WealthLink (GL3) SP; SNACK-Investment SP micro-ILP; AstraLink (VA2) MIP 10/15/20/25; Legacy Flex Solitaire (VA3) SP + RP MIP 5/10; Invest Flex (VS1) MIP 5/10/15/20; Invest Flex Vantage (VS2) MIP 5/10/15/20; Invest Flex TriVantage (VS3) MIP 10). Mapped one agent per finding; an independent verification fan-out (fresh agent per PDF) then diffed every modeled value — all 18 PASS. Provider legal name is "Income Insurance Limited" (the 2022 rebrand of NTUC Income); seeded as `provider.name: "Income Insurance"` (the `ntuc/` dir and `ntuc-` file prefix are kept for continuity with the PDF/findings folders).

**New `cash` SourceType enum value (schema change, migration `add_cash_source_type`).** Most Income Insurance ILPs (VA2, VA3, VS1/2/3, SNACK) state "payable only with cash" — they do not accept SRS, unlike WealthLink (GL3 = cash + SRS). The existing `cash_or_srs` asserts SRS availability, so it overstated those products. This is a different axis from Decision 011's cash+SRS _fee-equivalence_ collapse: `cash_or_srs` still means "cash and SRS accepted, identical fees"; `cash` means "cash only, no SRS/CPF." GL3 stays `cash_or_srs`; the other 17 files are `cash`. First provider to need it; future cash-only products reuse it.

Product-specific facts:

- **`basic_sum_assured` policy fee — Legacy Flex Solitaire (VA3).** The Policy Fee is a % of sum-assured-at-entry × an entry-age band, charged monthly for the first 4 years only (not % of policy value). Mapped to `feeType: basic_sum_assured` (Decision 020), persona age 25 → 21–25 band = 0.20%, `recurringLength: 4`. SP carries a 4% premium charge; RP variants use `term` allocation with year-by-year premium charges (MIP5: 28/23/14/7/5; MIP10: 35/26/15/10/4.5 then 3% to year 10) and `paymentTermYears` = MIP.
- **AstraLink (VA2) policy fee 5%→1% of account value** (recurring length 5 → perpetual from year 6) — the ManuInvest Duo shape, and the steepest early wrap fee in the set. VS1/VS2/VS3 use 2.5%→0.5% (step at year 11).
- **SNACK-Investment seeded with zero policy-level fees** — truthful (all cost is the fund-layer management fee, excluded per Decision 028); verified consumer-owned (not a Dash-style group artifact). Micro-ILP, S$1 min, single sub-fund.
- **VS1 and VS2 both kept** despite byte-identical modeled fees (verified) — they differ only in excluded investment-bonus rates (VS1 the higher tier). Same rationale as SmartRetire Income/Sum (026). VS3 is a single MIP-10 product (15% fixed bonus, excluded).
- **WealthLink (GL3): 3.5% premium charge only** — explicit zero policy fee, zero insurance cover charge, zero surrender charge.
- COI excluded across all (Decision 027; NTUC rates added to its reference table). Post-MIP allocation uplifts (102%/105%) are excluded bonuses (028); `allocationTillPolicyYear` = MIP for regular-premium products (post-MIP premiums not modeled). The verification pass caught and fixed two extraction bugs: VA3 RP files used `chargePercentage` instead of `premiumChargePercentage` in allocation terms (would crash the seed), and VS2 files had `allocationTillPolicyYear: null` instead of = MIP.

**Addendum 2026-06-12 — `cash` vs `cash_or_srs` rule applied dataset-wide.** Once `cash` existed, the old blanket `cash_or_srs` default (a relic of Decision 011's cash+SRS collapse) was re-examined against every PDF across all 10 providers (one agent per provider). Ratified rule: **default to `cash` (cash-only); use `cash_or_srs` only when the PDF explicitly names SRS as a premium-payment method; `cpfis` unchanged.** SRS mentioned only in payout/dividend/distribution context does not qualify. Final dataset: **179 `cash` / 17 `cash_or_srs` / 8 `cpfis`** (204 total). The 17 `cash_or_srs` survivors are products whose PDFs explicitly permit SRS premiums — predominantly single-premium variants (AIA ESI/PRE/Invest Easy SP, Manulink II, GE Prestige Portfolio, NTUC WealthLink, Tokio #goElite/Secure), plus the products that list SRS in a premium-method table (GE Flexi/Invest Advantage RSP+SP, Prudential PRULink InvestGrowth, HSBC Wealth Invest). Notable nuance: AIA Elite Secure Income and Platinum Retirement Elite permit SRS **only for their single-premium variants**, so their RP/5-Pay variants are `cash` while the SP variants stay `cash_or_srs`.

## 032 — Tokio Marine Life Singapore seed data: escalating-on-account-value charges, policy-level total-value fees, dual-account ILPs — 2026-06-12

Seeded 43 Tokio Marine Life variants across 21 products — the largest and most structurally varied provider, completing all 10 v1 providers. Mapped one agent per product (4 batches), then an independent verification fan-out grouped by structural twins diffed every value — all PASS after fixing one bug (Harvest Max's policy-charge `activeFromPolicyYear` 1→4). Provider legal name "Tokio Marine Life Insurance Singapore Pte. Ltd." → `provider.name: "Tokio Marine Life"`; dir `tokiomarine/`, file prefix `tml-`. The findings doc's flat-vs-escalating column proved unreliable (it wrongly classed #goClassic as escalating; the PDF says a flat 5.4% of IUA value — a 5.4% _escalating_ charge would hit 135%/yr, which sanity-checks the correction), so every formula was re-extracted from source PDFs.

**Two new modeling patterns (extend Decisions 020/030):**

- **Escalating charge on an account-value base → `term` on `account_value`.** TML's initial/setup charge = `X% p.a. × Initial Units Account value × N/12` (N = policy year) escalates on the IUA _value_, which the annual-premium-hardcoded `escalating_n` cannot express. Materialized as `chargeSchedule: term`, `feeType: account_value`, year-n `chargePercentage = X × min(n, cap)`. Rates stay sane because X is small (0.30–1.12%). The cap is product-specific and verified per PDF: most use `min(n, MIP/PPT)`; **#goAffluence** caps at PPT (reaching 12.75%) while **Affluence@Future** explicitly caps at **PPT−5** — a genuine product difference, not an inconsistency. The escalating _policy_ charge (`Y% × annualised premium × N/12`) fits `escalating_n` on `annual_premium`, with `activeFromPolicyYear` = the actual start year derived from the stated start month (month 25→year 3, 37→year 4, 49→year 5; AUA-only products start year 1).
- **Charge on "total policy value" → policy-level fee.** TM Atlas Wealth (1.5%) and #goClassic / #goClassic Secure (1.35%) levy a flat policy charge on _total_ policy value (IUA+AUA), deducted from both accounts. Modeled as a **policy-level** `policyAccountFees` row (`policyAccountId = null` → charged on total policy value per SCHEMA.md), not on the AUA alone (which understates while the IUA holds value in early years).

**Product-specific facts:**

- **Single-premium trio (#goElite, #goElite Secure, #goWealth Enrich):** 100% allocation (premium charge 0%); an **Establishment Charge** = 1.4% p.a. × initial single premium for 60 months → `cumulative_premium_paid`, recurring length 5; an ongoing Admin Charge of 1.0% of account value (perpetual); surrender Y1–5 (7/5.6/4.2/2.8/1.4) levied on the _initial single premium_ → surrender `feeType: cumulative_premium_paid` (the SP-faithful base, verified against the PDFs).
- **Dual IUA+AUA accounts** (most regular-premium products): premiums route to the IUA for the first 12/24/36/48 months (product-specific), then the AUA; surrender on IUA value; initial charge on IUA; policy/admin charges on AUA or annual premium.
- **Admin charges**: "2.00% p.a. × annualised premium /12" (Harvest Pro/Max, Wealth Max II) → `annual_premium` recurring; "5% of each regular premium received from year 4 to MIP end" (Harvest Flexi, Wealth Flexi) → a `term` premium-allocation schedule (0% years 1–3, 5% years 4–MIP).
- **Byte-identical twins kept separate** (differ only in excluded bonuses, per the SmartRetire/VS precedent): Wealth Builder@Future = Harvest Builder@Future; Harvest Flexi = Wealth Flexi; Harvest Pro ≈ Wealth Pro II (the latter drops the admin charge).
- **Wealth Flexi-Link 3.12 / 5.10**: policy-charge base "Total Investment Value" (AUA + eligible rider value) ≈ `account_value` (no riders modeled); 5.10 uniquely charges **0% after the MIP**.
- **#goAssure**: the only TML product with TPD coverage (separate Death + TPD MPC tables, Decision 027). **TM Wealth Enhancer (CPFIS)**: pure fund wrapper, zero policy-level fees, `sourceType: cpfis`.

**Funding source — `cash` default for silent PDFs.** Only 9 PDFs state funding (6 cash-only; 2 cash+SRS = goElite/goElite Secure; 1 CPFIS = Wealth Enhancer); the other 18 are silent. Since every TML product that _does_ specify is cash-only, the silent ones were ratified to `sourceType: cash` (the Decision 031 enum), pending PHS confirmation. Excluded throughout (Decisions 027/028): MPC/mortality (Death + TPD), premium-shortfall, partial-withdrawals, top-ups, all bonuses, the 1.60% credit-card surcharge (a payment-method fee, not a policy charge), and USD/multi-currency variants (SGD seeded). **This entry completes the v1 seed dataset: 10 providers, 204 variants.**

## 033 — `term_end_behaviour` is term-only; `is_fee_available` semantics; fee end-of-life conventions — 2026-06-12

**Context.** `PolicyAccountFee.termEndBehaviour` (`stop` | `persist_last`) had been set inconsistently: 27 `term` fees plus 25 non-`term` fees (20 `recurring`, 5 `escalating_n`, all `'stop'`) carried a value, while `perpetual` never did. Investigating what the field _means_ (it describes what happens to a fee **after its scheduled term ends**) showed the non-`term` values were redundant or, for `escalating_n`, actively misleading. A DB audit of the `escalating_n` cohort settled it: the 5 `'stop'` rows are all TML #goAssure Policy Charges that genuinely end after their cap (no successor row), whereas the "persist after the cap" case (Etiqa flex prime/pro/vista, FWD Horizon) is **already modeled as an explicit chained continuation fee row** ("from year N+1 onwards… to age 100"), not via `term_end_behaviour`. So row-chaining — not the field — is the project's mechanism for post-cap persistence (49 of 54 `escalating_n` fees use it).

**Decision — `term_end_behaviour` applies only to `charge_schedule = 'term'`.** A fee's end-of-life is determined by its schedule:

- **`term`** — bounded by its materialized `policyAccountFeeTerms` (per-year rows); `term_end_behaviour` records what happens after the last term year and is **required** (all 27 are `'stop'` today; the field exists to allow `persist_last`).
- **`recurring` / `escalating_n`** — bounded by `recurring_length`: the fee is active `activeFromPolicyYear .. activeFromPolicyYear + recurring_length − 1`, then **stops**. (`recurring_length` is already required for `recurring`, present on these `escalating_n` rows.) `escalating_n`'s formula `min(year, cap)` would otherwise _persist_ at the capped rate forever, so "stops after `recurring_length`" is now the defined engine contract; persistence past the cap is expressed by a **separate chained fee row**, never by `term_end_behaviour`.
- **`perpetual`** — never ends; `term_end_behaviour` is `null`.

Enforced by `CHECK policy_account_fees_charge_schedule_term_ck`: `term_end_behaviour IS NOT NULL` iff `charge_schedule = 'term'` (migration `20260612144054_term_end_behaviour_constraint`, which first nulls the 25 non-`term` values). The only `persist_last` in the dataset is one **account-level** `PolicyAccount.termEndBehaviour` (premium-allocation field, a different table) — out of scope of this fee-level rule.

**Decision — `is_fee_available` (renamed from `is_percentage_available`, migration `20260612095753_flat_fee_update`).** Means "this fee charges something," not "a percentage is available": `is_fee_available = (charge_percentage IS NOT NULL) OR (flat_fee_amount IS NOT NULL)`. Enforced by `fee_availability_ck` (exactly one of pct/flat when available; both null when not; `term` exempt). The 7 flat-fee rows are therefore `TRUE`. **Done (2026-06-12):** the key was renamed to `isFeeAvailable` directly in all 185 seed-data JSON files via a structural per-fee transform (`isFeeAvailable = isPercentageAvailable || flatFeeAmount != null`; 338 keys, 7 flat-fee `false→true` flips), verified against the live DB (identical 334-true/4-false distribution, same rows). The translation shim was removed — `seed.ts` now passes `isFeeAvailable` straight through and the `SeedFee` interface carries it. (Done with a single structural script rather than agent fan-out: the transform is deterministic and the DB provides an exact equivalence check, which is stronger than distributing edit logic.)

## 034 — Policies list endpoint returns a `select`-shaped response, not the raw entity — 2026-06-16

`GET /policies` (`PolicyService.findAll`) returned `Policy[]` with scalar fields only — so the provider arrived as `providerId` (an integer FK), never the company name the table needs ("AIA", not "3"). Fixed by selecting exactly the fields the list view renders, including the provider name via relation: `select: { id, name, description, sourceType, domicile, paymentTermYears, provider: { select: { name: true } } }`.

**`select` over `include`.** `include: { provider: true }` returns every Policy column plus the whole Provider row, and silently widens the API contract whenever a column is added to either table. `select` is intentional and stable: adding an internal-only column to `Policy` later does not change the response. At a system boundary, control over the contract beats the convenience of auto-including everything. (`select` also reads fewer columns — negligible here, but real.)

**Entity vs DTO, resolved for v1 without a mapping layer.** Selecting _is_ the contract — the endpoint no longer returns the raw ORM entity. A dedicated DTO / transform layer only earns its place once the API shape must diverge from the DB shape across several endpoints; not now. Provider comes back nested (`provider: { name }`), which the table consumes directly; flattening to `providerName` would add a `.map` for no benefit.

Consequences: the controller's return type changes from `Policy[]` to the select payload type (`Prisma.PolicyGetPayload<{ select: … }>`) so the type tracks the real shape. The selected field list is the union of (table columns) ∪ (client-side filter fields: provider name, `paymentTermYears`) ∪ `id`; finalised when the table columns are. Filters are derived client-side from the full 204-row fetch, so whatever is filtered on must be in the payload. _Decided; not yet implemented._

## 035 — FE↔BE connectivity: Vite dev proxy + NestJS global `/api` prefix (same-origin-oriented) — 2026-06-16

The browser blocks the frontend (Vite, `:5173`) from calling the backend (`:3000`) cross-origin. Chosen fix: a **Vite dev proxy** (`server.proxy`) — the FE calls same-origin relative paths (`/api/...`) and Vite forwards them to `:3000` server-side. CORS is a _browser_ policy on cross-origin requests; routing the call through the dev server means the browser never makes a cross-origin request, so there is nothing to block. This is not "disabling CORS" — it removes the cross-origin call from the browser entirely. (`app.enableCors()` was the alternative; rejected for v1 because it forces a premature production security decision — which origins may call the API — that the proxy lets us defer.)

**NestJS `app.setGlobalPrefix('api')`** so routes genuinely serve under `/api/*`. The prefix lives where the routes live: the dev proxy needs no `rewrite`, and the eventual same-origin reverse-proxy rule is a trivial 1:1 map (`/api/* → backend`, everything else → SPA). A proxy `rewrite` that strips `/api` was rejected as invisible routing logic — explicit over implicit.

This builds toward a **same-origin** production topology (relative paths work behind a reverse proxy, or with the backend serving the built SPA) while staying reversible to **split-origin** (add a `VITE_API_URL` base + scoped CORS — a small change, not a rewrite). Same-origin ≠ deployed-together: a reverse proxy gives same-origin with independent deploys. Auth is not a v1 concern; if cookie-based sessions arrive later, same-origin is the lower-friction path and tilts the eventual prod choice.

Consequence: every route shifts — `GET /policies` becomes `GET /api/policies`; update `curl`/docs references. Controller unit tests call methods directly (not over HTTP) and are unaffected. _Decided; not yet implemented._

## 036 — Frontend data layer: React Query, 1-hour `staleTime` and `gcTime` — 2026-06-16

React Query (TanStack Query) is the v1 frontend data layer, chosen over hand-rolled `fetch` + `useEffect`. Even though the landing page makes essentially one on-mount read (all 204 policies fetched once, filtered client-side), adopting React Query now establishes the data-state pattern — caching, loading/error/empty handling, per-key dedup — before the details endpoint and illustration engine introduce many cache-able per-`id` fetches.

Configuration (`QueryClient` defaults): **`staleTime` and `gcTime` both 1 hour**, `refetchOnWindowFocus: false`. Policy data is effectively static (changes ~yearly when providers republish), so within an hour, navigating back to the index serves instantly from cache with no refetch; after an hour the inactive cache is garbage-collected and the next visit refetches — a deliberate, cheap freshness floor. Window-focus refetch is off for the same reason; more interactive endpoints can override per-query with shorter times later.

Caveat: React Query's cache is **in-memory** — it survives in-SPA navigation but **not** a full page reload / browser restart. Cross-reload persistence would need `persistQueryClient` + a storage persister, out of scope for v1. The list query key is stable (`['policies']`) because filtering is client-side; server-side filtering would fold filter params into the key. _Decided; not yet implemented._

## 037 — Policy detail page & on-frontend illustration engine — 2026-06-17

The `/policies/:id` detail page projects a chosen policy over 40 years; the engine runs on the FE (DEC 004–007). Product/UX decisions ratified during design:

- **Inputs:** **monthly** premium for regular-premium products (default S$400/mo), **single** premium for SP products (default S$10,000) — the engine reads single-vs-regular from `premiumAllocationType`. A **3% / 8%** return toggle (DEC 005), both pre-computed and cached, default 3%.
- **Horizon:** fixed **40 years** for every policy; the MIP (`paymentTermYears`) is shaded. Premiums paid monthly through the MIP, then growth + fees continue to year 40.
- **Two graphs:** (1) premiums-paid · gross · net value — the gross↔net gap is fees, where **gross = every premium fully invested at the return rate with zero charges**; (2) the **surrender fee** (`$ = net × rate`) vs net value, which falls to zero when the surrender charge ends (no separate marker).
- **Excluded fees → bottom disclaimer, no manual input in v1:** COI/insurance and sub-fund/fund-layer charges (DEC 027/028), undisclosed-rate fees (`isFeeAvailable = false`), and `basic_sum_assured` fees are omitted from the projection and named in a disclaimer. USD / premium-band-dependent products show a "not available in v1" notice instead of a (misleading) projection.
- **Routing:** react-router (`/policies/:id`, deep-linkable). `findOne` extended to include `provider:{name}`. **Charts: Recharts** — React-native, and its built-in `<Tooltip>` already gives hover-to-see-the-year's-figures (the planned enhancement is effectively free).
- **Engine structure:** pure `lib/illustration/` (`runIllustration`/`feeForMonth`/`surrenderFeeForYear`/`summarize`), heavily unit-tested; multi-account surrender approximated on total net value (documented). Monthly premium reconciles with DEC 029 because all schedules are policy-year-keyed and `annual_premium` bases use monthly×12.

## 038 — Frontend formatting & pre-commit enforcement — 2026-06-17

`prettier-plugin-tailwindcss` (deterministic class ordering, v4 `tailwindStylesheet` pointer), a repo-wide Prettier baseline, the generated Prisma client excluded from Prettier (`.prettierignore`), and a **husky + lint-staged pre-commit hook** running `prettier --write` on staged files so commits land clean. Local commands only — CI-ready, no pipeline yet. Runner separation: FE Vitest owns `src/**/*.test.{ts,tsx}`, Playwright owns `e2e/**/*.spec.ts`, so the two never collide.

## 039 — UI design system: "warm & calm" (planned) — 2026-06-17

The shipped v1 UI was generic Tailwind grays + system font. Ratified overhaul direction: **warm & calm** — a cream/ink palette + clay accent + calm-teal data colors as Tailwind v4 `@theme` tokens; type pairing **Fraunces** (display) + **Hanken Grotesk** (body, `tabular-nums` figures), self-hosted via Fontsource; the landing table becomes a soft **`PolicyCard`** grid; shared UI primitives (`Card`/`Pill`/`Button`/`Field`/`SegmentedControl`/`StatCard`) that also encapsulate Tailwind (the "extract components, not class strings" move); **restrained motion** (`motion` lib — one staggered reveal, hover lift, gentle chart draw-on, respecting `prefers-reduced-motion`). The detail page is re-themed in place (already built). Tickets: `docs/superpowers/plans/fe/open/ui-overhaul/` (U1–U4) + `qa/open/ui-overhaul/` (QU1); design source `~/.claude/plans/now-i-want-to-sprightly-wave.md`. **Decided; not yet implemented.**
