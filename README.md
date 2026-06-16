# ILP Visibility

A fee-transparency tool for Singapore **Investment-Linked Policies (ILPs)**. It extracts the fee and surrender-charge tables buried in provider Product Summary PDFs, models them against a shared schema, and surfaces them as plain, comparable figures — including a projected account-value and surrender-value illustration.

The target user is a consumer who already holds (or is being sold) an ILP and starts from the *document*, not from a spreadsheet. The main existing tool, SGFIREPlanner, serves sophisticated users willing to enter charges by hand; no tool today does document-based extraction.

> This is a learning-first project: the build doubles as a deep dive into backend/database/architecture reasoning. Every non-trivial decision is recorded with its rationale in [`DECISIONS.md`](./DECISIONS.md).

---

## Goals

- **Make ILP costs legible.** Turn the scattered, inconsistently-formatted charge tables across ~10 providers into one normalised data model.
- **Illustrate, don't just list.** Project account value (ACV) and surrender value year-by-year so a user can answer "what do I walk away with if I exit at year N?"
- **Estimate, not replicate.** Outputs approximate provider Benefit Illustrations closely enough to be teachable, without trying to reconcile to the cent (rounding, mid-month deductions, and charge-base nuances are deliberately not matched).
- **Stay explainable.** Schema, scope, and modelling assumptions are documented so the numbers can always be traced back to a source PDF and a decision.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Backend | **NestJS 11** (TypeScript, ESM) | The deliberate learning surface — modules, controllers, services, DI |
| ORM / DB | **Prisma 7** + **PostgreSQL** | `prisma-client` generator, `@prisma/adapter-pg`; models map to snake_case tables via `@@map`/`@map` |
| Frontend | **React 19** + **Vite 8** (TypeScript) | Currently the scaffold only; kept familiar so it isn't a learning variable |
| Tests | **Vitest 4** | Migrated from Jest for native ESM |
| Extraction | **Python** + **pdfplumber** | Offline script; JSON is the boundary between Python and the web layer |
| Tooling | **pnpm** workspaces, shared root ESLint/Prettier/TS config | Monorepo with strict per-workspace dependency isolation |

End-to-end TypeScript so backend data-model types can be shared with the frontend without codegen.

---

## Repository Layout

```
ilp-visibility/
├── backend/                  NestJS API + Prisma
│   ├── prisma/
│   │   ├── schema.prisma     8-table relational model (see below)
│   │   ├── migrations/       applied SQL migrations
│   │   ├── seed-data/        per-provider seed JSON (gitignored)
│   │   └── seed.ts           loads one JSON file at a time
│   └── src/
│       ├── policy/           PolicyController, PolicyService, PolicyModule (+ specs)
│       ├── prisma.service.ts PrismaClient wrapper (pg adapter)
│       ├── prisma.module.ts  @Global() — injectable everywhere
│       ├── generated/prisma/ generated Prisma client
│       └── main.ts / app.module.ts
├── frontend/                 React 19 + Vite scaffold
├── scripts/                  explore.py — pdfplumber walker over a target PDF
├── pdfs/                     source Product Summaries + extraction findings (gitignored)
├── docs/.context/           CONTEXT, SCHEMA, future-work handoff notes (gitignored)
├── DECISIONS.md             architectural decision log (the source of truth)
├── pnpm-workspace.yaml
└── shared root config        tsconfig.base.json, eslint.config.base.mjs, prettier.config.mjs
```

### Data model

The fee structure is naturally relational, so it lives in Postgres rather than static JSON:

```
Provider → Policy → PolicyAccount ──┬─ PolicyAccountPremiumAllocationTerm
                                    ├─ PolicyAccountFee ─ PolicyAccountFeeTerm
                                    └─ PolicyAccountSurrenderFee ─ PolicyAccountSurrenderFeeTerm
```

A `Policy` has one or more sub-accounts (e.g. Initial/Accumulation Units). Fees and surrender charges attach to an account (or to the whole policy when `policyAccountId` is null) and carry a `chargeSchedule` (`perpetual` / `recurring` / `term` / `escalating_n`) describing how the rate evolves over policy years. See [`backend/prisma/schema.prisma`](./backend/prisma/schema.prisma) for the full definition.

---

## Current Progress

**Phase: build.** Research is complete (10 providers, ~95 PDFs analysed); the v1 data model is finalised and stress-tested; v1 scope is locked.

**Done**
- Monorepo scaffolded; both apps build, lint, typecheck.
- Backend migrated to ESM; PrismaService wired up via a `@Global()` module.
- Postgres schema (8 tables, CHECK constraints, composite FKs, unique constraints) managed by Prisma migrations.
- `PolicyModule` live:
  - `GET /api/policies` — list with optional `?q=` (case-insensitive name search) and `?provider=` (provider-ID filter).
  - `GET /api/policies/:id` — full nested policy tree; 404 for missing, 400 for non-integer IDs.
- Controller + service unit tests under Vitest.
- Seed JSON authored for **8 providers / ~157 variants** via per-family agent fan-out: AIA (16), Great Eastern (16), Prudential (21), HSBC Life (16), Singlife (10), FWD (16), Etiqa (31), Manulife (15). Interpretation decisions ratified in DECISIONS 019–026.
- **AIA (16 variants)** loaded into the database and serving from `GET /api/policies`.

**Not yet built**
- Loading the other 7 providers' seed JSON into the DB (authored, not yet seeded).
- Seed JSON for the final 2 providers: **NTUC Income, Tokio Marine**.
- The **illustration engine** — monthly ACV recurrence, fee deduction, surrender charts (design locked in DECISIONS 004–007).
- The PDF pipeline's **LLM normalisation stage** (raw pdfplumber extraction works; PDF→schema does not).
- Any **frontend UI** beyond the Vite scaffold.
- Docker Compose for Postgres (deferred; local install is sufficient).

### v1 scope (locked)

Policy-level fees and surrender fees only. Out of scope for v1: cost of insurance, switching fees, premium-holiday fees, top-up / partial-withdrawal fees, premium-shortfall charges, and USD-domiciled variants. The user is modelled as paying all premiums on time with no partial withdrawals. See [`DECISIONS.md`](./DECISIONS.md) and the v1 scope exclusions for the reasoning.

---

## Where to Read What

- **Architectural decisions + rationale** — [`DECISIONS.md`](./DECISIONS.md) (entries 001–026)
