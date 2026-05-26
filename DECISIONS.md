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

