# Architectural Decisions

Decisions made during development, in chronological order. Written for clarity, learning, and future reference.

---

## 001 — SvelteKit as the web framework

SvelteKit's built-in server routes (`+page.server.ts`) handle the full trajectory from static data to a DB-backed API in one framework. No SSR is needed for v1, but when the data layer migrates to a database, SvelteKit handles it natively without introducing a separate backend service.

---

## 002 — Python (pdfplumber) for extraction, TypeScript for the web layer

pdfplumber is the strongest tool for structured table extraction from text-based PDFs. The extraction script runs offline and outputs JSON — the JSON file is the boundary between the two languages. The web app never needs to know Python exists.

---

## 003 — Static JSON committed to the repo as the v1 data layer

PDFs are processed offline, structured JSON is committed to the repo, and SvelteKit reads it at build time. The migration path to a database is explicit: `+page.ts` becomes `+page.server.ts`, the static import becomes a DB query, and the Svelte component is untouched. Chosen deliberately to make the migration a hands-on learning exercise rather than something to avoid.

---
