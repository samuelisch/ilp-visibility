// Hand-written FE types mirroring the `GET /api/policies` select shape (DECISION 034).
// Deliberately NOT imported from the backend's Prisma client — that type lives in a
// separate ESM workspace with a generated client, and a small shared shape is cleaner.

export type Domicile = 'sgd' | 'usd';
export type SourceType = 'cash_or_srs' | 'cpfis' | 'cash';

export interface PolicyListItem {
  id: number;
  name: string;
  description: string;
  domicile: Domicile;
  paymentTermYears: number | null;
  sourceType: SourceType;
  provider: { name: string };
}

// `GET /api/policies/:id` returns the full nested tree, consumed by the detail page and
// illustration engine. NOTE: Prisma Decimal columns serialize to JSON **strings**, so every
// percentage/amount below is typed `string` — the engine parses with Number().
export type PremiumAllocationType = 'single' | 'recurring' | 'term';
export type ChargeSchedule = 'perpetual' | 'recurring' | 'term' | 'escalating_n';
export type FeeType =
  | 'account_value'
  | 'annual_premium'
  | 'cumulative_premium_paid'
  | 'notional_premium'
  | 'basic_sum_assured';
export type SurrenderFeeType = 'account_value' | 'cumulative_premium_paid';
export type TermEndBehaviour = 'stop' | 'persist_last';

export interface PolicyAccountFeeTerm {
  policyYear: number;
  chargePercentage: string;
}
export interface PolicyAccountFee {
  id: number;
  description: string;
  chargeSchedule: ChargeSchedule;
  activeFromPolicyYear: number;
  termEndBehaviour: TermEndBehaviour | null;
  recurringLength: number | null;
  feeType: FeeType;
  notionalPercentage: string | null;
  isFeeAvailable: boolean;
  chargePercentage: string | null;
  flatFeeAmount: string | null;
  minPremium: number | null;
  maxPremium: number | null;
  policyAccountFeeTerms: PolicyAccountFeeTerm[];
}
export interface PolicyAccountSurrenderFeeTerm {
  policyYear: number;
  chargePercentage: string;
}
export interface PolicyAccountSurrenderFee {
  id: number;
  feeType: SurrenderFeeType;
  termEndBehaviour: TermEndBehaviour | null;
  policyAccountSurrenderFeeTerms: PolicyAccountSurrenderFeeTerm[];
}
export interface PolicyAccountPremiumAllocationTerm {
  policyYear: number;
  premiumChargePercentage: string;
}
export interface PolicyAccount {
  id: number;
  description: string;
  allocationFromPolicyYear: number;
  allocationTillPolicyYear: number | null;
  premiumChargePercentage: string | null;
  premiumAllocationType: PremiumAllocationType;
  termEndBehaviour: TermEndBehaviour | null;
  policyAccountPremiumAllocationTerms: PolicyAccountPremiumAllocationTerm[];
  policyAccountFees: PolicyAccountFee[];
  policyAccountSurrenderFees: PolicyAccountSurrenderFee[];
}
export interface PolicyDetail {
  id: number;
  name: string;
  description: string;
  domicile: Domicile;
  paymentTermYears: number | null;
  sourceType: SourceType;
  provider: { name: string };
  policyAccounts: PolicyAccount[];
  policyAccountFees: PolicyAccountFee[]; // policy-level (accountId = null)
  policyAccountSurrenderFees: PolicyAccountSurrenderFee[];
}
