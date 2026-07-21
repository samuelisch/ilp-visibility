import type { PolicyDetail } from '../types/policy';

export function omittedFeeNotes(detail: PolicyDetail): string[] {
  const notes = [
    'Excludes insurance/mortality charges (COI) and sub-fund/fund-management fees — these reduce real returns.',
  ];
  const allFees = [
    ...detail.policyAccounts.flatMap((a) => a.policyAccountFees),
    ...detail.policyAccountFees,
  ];
  const undisclosed = allFees.filter((f) => !f.isFeeAvailable).map((f) => f.description);
  if (undisclosed.length)
    notes.push(`Excludes ${undisclosed.join(', ')}. The provider did not publish their rate.`);
  const bsa = allFees.filter((f) => f.feeType === 'basic_sum_assured').map((f) => f.description);
  if (bsa.length)
    notes.push(
      `Excludes ${bsa.join(', ')}. This fee is based on your sum assured and will only be available in the policy document your agent will send you.`,
    );
  return notes;
}
