import type { PolicyDetail, PolicyAccount } from '../../types/policy';
import type { IllustrationInput, IllustrationResult, YearRow } from './types';
import { feeForMonth } from './feeForMonth';
import { surrenderFeeForYear } from './surrenderFeeForYear';

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
  const isSingle = accounts.every((a) => a.premiumAllocationType === 'single');
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
  const byYear: YearRow[] = [];
  const total = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  for (let month = 0; month < HORIZON * 12; month++) {
    const policyYear = Math.floor(month / 12) + 1;
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
      net[idx] += input.premium * (1 - charge / 100);
      gross[idx] += input.premium;
    }

    // grow
    for (let i = 0; i < accounts.length; i++) {
      net[i] *= 1 + r;
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
        net[i] -= feeForMonth(fee, {
          policyYear,
          accountValue: net[i],
          annualisedPremium,
          cumulativePremiumsPaid: premiumsPaid,
          notionalBase,
          paymentTermYears: ppt,
        });
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
    }

    // year-end snapshot
    if (month % 12 === 11) {
      const netNow = total(net);
      byYear.push({
        year: policyYear,
        premiumsPaid,
        grossValue: total(gross),
        netValue: netNow,
        surrenderFee: surrenderFeeForYear(allSurrender, {
          policyYear,
          accountValue: netNow,
          cumulativePremiumsPaid: premiumsPaid,
        }),
      });
    }
  }

  return { byYear };
}
