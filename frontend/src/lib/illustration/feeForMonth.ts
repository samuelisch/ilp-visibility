import type { PolicyAccountFee } from '../../types/policy';
import type { FeeContext } from './types';

const pct = (s: string | null): number => (s == null ? 0 : Number(s) / 100);

/** Dollar charge for one fee in one month. */
export function feeForMonth(fee: PolicyAccountFee, ctx: FeeContext): number {
  if (!fee.isFeeAvailable) return 0; // undisclosed rate — excluded (disclaimer)
  if (fee.feeType === 'basic_sum_assured') return 0; // base unknown — excluded (disclaimer)
  if (fee.flatFeeAmount != null) {
    return ctx.policyYear >= fee.activeFromPolicyYear ? Number(fee.flatFeeAmount) : 0;
  }

  // escalating_n: own formula, base is annualised premium × min(year, PPT)
  if (fee.chargeSchedule === 'escalating_n') {
    if (ctx.policyYear < fee.activeFromPolicyYear) return 0;
    if (
      fee.recurringLength != null &&
      ctx.policyYear > fee.activeFromPolicyYear + fee.recurringLength - 1
    )
      return 0;
    const cap = ctx.paymentTermYears ?? ctx.policyYear;
    const n = Math.min(ctx.policyYear, cap);
    return (pct(fee.chargePercentage) / 12) * ctx.annualisedPremium * n;
  }

  // resolve this year's annual rate by schedule
  let annualRate = 0;
  switch (fee.chargeSchedule) {
    case 'perpetual':
      if (ctx.policyYear < fee.activeFromPolicyYear) return 0;
      annualRate = pct(fee.chargePercentage);
      break;
    case 'recurring':
      if (ctx.policyYear < fee.activeFromPolicyYear) return 0;
      if (
        fee.recurringLength != null &&
        ctx.policyYear > fee.activeFromPolicyYear + fee.recurringLength - 1
      )
        return 0;
      annualRate = pct(fee.chargePercentage);
      break;
    case 'term': {
      const row = fee.policyAccountFeeTerms.find((t) => t.policyYear === ctx.policyYear);
      if (row) {
        annualRate = pct(row.chargePercentage);
      } else if (fee.termEndBehaviour === 'persist_last' && fee.policyAccountFeeTerms.length) {
        const last = fee.policyAccountFeeTerms.reduce((a, b) =>
          b.policyYear > a.policyYear ? b : a,
        );
        annualRate = ctx.policyYear > last.policyYear ? pct(last.chargePercentage) : 0;
      }
      break;
    }
  }
  if (annualRate === 0) return 0;

  const monthly = annualRate / 12;
  switch (fee.feeType) {
    case 'account_value':
      return monthly * ctx.accountValue;
    case 'annual_premium':
      return monthly * ctx.annualisedPremium;
    case 'cumulative_premium_paid':
      return monthly * ctx.cumulativePremiumsPaid;
    case 'notional_premium':
      return monthly * ctx.notionalBase;
    default:
      return 0;
  }
}
