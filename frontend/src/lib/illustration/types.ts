export interface YearRow {
  year: number;
  premiumsPaid: number;
  grossValue: number;
  netValue: number;
  surrenderFee: number;
}
export interface IllustrationResult {
  byYear: YearRow[];
}
export interface IllustrationInput {
  premium: number; // monthly for regular; lump sum for single
  annualReturnRate: number; // percent, e.g. 3 or 8
}
export interface FeeContext {
  policyYear: number;
  accountValue: number; // post-growth value the fee applies to
  annualisedPremium: number; // monthly × 12 (regular); single premium (single)
  cumulativePremiumsPaid: number;
  notionalBase: number; // premiums accumulated at notionalPercentage, frozen at MIP end
  paymentTermYears: number | null;
}
