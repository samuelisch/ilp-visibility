import type { PolicyAccountSurrenderFee } from '../../types/policy';

const pct = (s: string | null): number => (s == null ? 0 : Number(s));

export interface SurrenderContext {
  policyYear: number;
  accountValue: number;
  cumulativePremiumsPaid: number;
}

export function surrenderFeeForYear(
  surrenderFees: PolicyAccountSurrenderFee[],
  ctx: SurrenderContext,
): number {
  let total = 0;
  for (const sf of surrenderFees) {
    const terms = sf.policyAccountSurrenderFeeTerms;
    const row = terms.find((t) => t.policyYear === ctx.policyYear);
    let rate = 0;
    if (row) {
      rate = pct(row.chargePercentage);
    } else if (sf.termEndBehaviour === 'persist_last' && terms.length) {
      const last = terms.reduce((a, b) => (b.policyYear > a.policyYear ? b : a));
      if (ctx.policyYear > last.policyYear) rate = pct(last.chargePercentage);
    }
    if (rate === 0) continue;
    const base =
      sf.feeType === 'cumulative_premium_paid' ? ctx.cumulativePremiumsPaid : ctx.accountValue;
    total += (rate / 100) * base;
  }
  return total;
}

export function surrenderRateForYear(
  surrenderFees: PolicyAccountSurrenderFee[],
  ctx: SurrenderContext,
): number {
  let rate = 0;
  for (const sf of surrenderFees) {
    const terms = sf.policyAccountSurrenderFeeTerms;
    const row = terms.find((t) => t.policyYear === ctx.policyYear);
    if (row) rate += pct(row.chargePercentage);
    else if (sf.termEndBehaviour === 'persist_last' && terms.length) {
      const last = terms.reduce((a, b) => (b.policyYear > a.policyYear ? b : a));
      if (ctx.policyYear > last.policyYear) rate += pct(last.chargePercentage);
    }
  }
  return rate;
}
