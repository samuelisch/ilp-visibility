export interface YearRow {
  year: number;
  premiumsPaid: number; // cumulative
  premiumPaidThisYear: number; // premium paid during this year
  totalFeesThisYear: number; // premium charge + ongoing fees this year
  earningsThisYear: number; // investment growth credited to net this year
  grossValue: number;
  netValue: number;
  surrenderFee: number;
  surrenderRate: number; // contractual surrender % this year (0 if none)
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
