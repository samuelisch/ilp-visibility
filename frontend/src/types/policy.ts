// Hand-written FE types mirroring the `GET /api/policies` select shape (DECISION 034).
// Deliberately NOT imported from the backend's Prisma client — that type lives in a
// separate ESM workspace with a generated client, and a small shared shape is cleaner.

export type Domicile = 'sgd' | 'usd'
export type SourceType = 'cash_or_srs' | 'cpfis' | 'cash'

export interface PolicyListItem {
  id: number
  name: string
  description: string
  domicile: Domicile
  paymentTermYears: number | null
  sourceType: SourceType
  provider: { name: string }
}

// `GET /api/policies/:id` returns the full nested tree. In v1 it's only console.logged
// (no detail UI consumes it), so it stays untyped. Type it properly when the detail
// page / illustration engine arrives — and mind that Prisma Decimal fields serialize
// to JSON strings, not numbers.
export type PolicyDetail = unknown
