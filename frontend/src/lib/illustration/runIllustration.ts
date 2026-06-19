import type { PolicyDetail, PolicyAccount } from '../../types/policy';
import type { IllustrationInput, IllustrationResult, YearRow } from './types';
import { feeForMonth } from './feeForMonth';
import { surrenderFeeForYear, surrenderRateForYear } from './surrenderFeeForYear';
import { isSinglePremium } from '../policy';

// temp for now
const HORIZON = 40;

function premiumChargeRate(acct: PolicyAccount, policyYear: number): number {
  if (acct.premiumAllocationType === 'term') {
    const row = acct.policyAccountPremiumAllocationTerms.find((t) => t.policyYear === policyYear);
    return row ? Number(row.premiumChargePercentage) : 0;
  }
  return acct.premiumChargePercentage != null ? Number(acct.premiumChargePercentage) : 0;
}

export function runIllustration(
  policy: PolicyDetail,
  input: IllustrationInput,
): IllustrationResult {
  const r = input.annualReturnRate / 100 / 12;
  const accounts = policy.policyAccounts;
  const isSingle = isSinglePremium(accounts);
  const ppt = policy.paymentTermYears;
  const annualisedPremium = isSingle ? input.premium : input.premium * 12;

  const net = accounts.map(() => 0);
  const gross = accounts.map(() => 0);
  const allSurrender = [
    ...accounts.flatMap((a) => a.policyAccountSurrenderFees),
    ...policy.policyAccountSurrenderFees,
  ];
  const notionalFee = [
    ...accounts.flatMap((a) => a.policyAccountFees),
    ...policy.policyAccountFees,
  ].find((f) => f.feeType === 'notional_premium' && f.notionalPercentage != null);
  const np = notionalFee ? Number(notionalFee.notionalPercentage) : 0;

  let premiumsPaid = 0;
  let notionalBase = 0;
  // Per-year accumulators, reset each year start; power the year-table reconciliation:
  // premiumPaidThisYear − totalFeesThisYear + earningsThisYear = Δ netValue.
  let yearPremium = 0;
  let yearFees = 0;
  let yearEarnings = 0;
  const byYear: YearRow[] = [];
  const total = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  for (let month = 0; month < HORIZON * 12; month++) {
    const policyYear = Math.floor(month / 12) + 1;
    if (month % 12 === 0) {
      yearPremium = 0;
      yearFees = 0;
      yearEarnings = 0;
    }
    const premiumDue = isSingle ? month === 0 : policyYear <= (ppt ?? HORIZON);

    if (premiumDue) {
      const idx = Math.max(
        0,
        accounts.findIndex(
          (a) =>
            policyYear >= a.allocationFromPolicyYear &&
            (a.allocationTillPolicyYear == null || policyYear <= a.allocationTillPolicyYear),
        ),
      );
      const charge = premiumChargeRate(accounts[idx], policyYear);
      premiumsPaid += input.premium;
      yearPremium += input.premium;
      yearFees += input.premium * (charge / 100); // premium charge is a fee
      net[idx] += input.premium * (1 - charge / 100);
      gross[idx] += input.premium;
    }

    // grow
    for (let i = 0; i < accounts.length; i++) {
      const before = net[i];
      net[i] *= 1 + r;
      yearEarnings += net[i] - before;
      gross[i] *= 1 + r;
    }

    // notional base: accrue at np during the MIP, then freeze
    const mipEnded = ppt != null && policyYear > ppt;
    if (!mipEnded && np > 0) {
      notionalBase = notionalBase * (1 + np / 100 / 12) + (premiumDue ? input.premium : 0);
    }

    // ongoing fees (net only) — account-level then policy-level (pro-rata)
    for (let i = 0; i < accounts.length; i++) {
      for (const fee of accounts[i].policyAccountFees) {
        const f = feeForMonth(fee, {
          policyYear,
          accountValue: net[i],
          annualisedPremium,
          cumulativePremiumsPaid: premiumsPaid,
          notionalBase,
          paymentTermYears: ppt,
        });
        net[i] -= f;
        yearFees += f;
      }
    }
    const tNet = total(net);
    for (const fee of policy.policyAccountFees) {
      const charge = feeForMonth(fee, {
        policyYear,
        accountValue: tNet,
        annualisedPremium,
        cumulativePremiumsPaid: premiumsPaid,
        notionalBase,
        paymentTermYears: ppt,
      });
      if (tNet > 0) for (let i = 0; i < net.length; i++) net[i] -= charge * (net[i] / tNet);
      yearFees += Math.min(charge, tNet); // amount actually removed across accounts
    }

    // year-end snapshot
    if (month % 12 === 11) {
      const netNow = total(net);
      byYear.push({
        year: policyYear,
        premiumsPaid,
        premiumPaidThisYear: yearPremium,
        totalFeesThisYear: yearFees,
        earningsThisYear: yearEarnings,
        grossValue: total(gross),
        netValue: netNow,
        surrenderFee: surrenderFeeForYear(allSurrender, {
          policyYear,
          accountValue: netNow,
          cumulativePremiumsPaid: premiumsPaid,
        }),
        surrenderRate: surrenderRateForYear(allSurrender, {
          policyYear,
          accountValue: netNow,
          cumulativePremiumsPaid: premiumsPaid,
        }),
      });
    }
  }

  return { byYear };
}
