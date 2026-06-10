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

## 012 — Premium charges modeled on PolicyAccount, not PolicyAccountFee — 2026-05-29

Premium charges (the upfront percentage deducted from each premium payment) are economically different from ongoing fees (which erode account value over time). Premium charges reduce what gets invested at the point of payment; ongoing fees are deducted monthly from the account value after growth. Placing both in `PolicyAccountFee` would force the engine to branch on `fee_type` to decide when to apply the charge — an implicit assumption that belongs in the data model, not the engine.

`PolicyAccount` now carries `premium_allocation_type` (`'single'` | `'recurring'` | `'term'`), `premium_charge_percentage` (flat rate, null for term), and `term_end_behaviour`. A new `policy_account_premium_allocation_terms` table stores year-by-year charge rates when the rate varies. This also replaces `recurrence` on `Policy` — the engine infers the payment pattern from the account-level allocation type.

Cross-provider research confirmed that time-varying premium charges appear exclusively on regular premium products (AIA: 5 products, GE: 1, HSBC: 1, NTUC: 1, Prudential: 1). All single premium and top-up charges are flat across the entire dataset.

---

