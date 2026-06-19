// Single source of truth for "is this a single-premium product?" — derived from the engine's
// signal (every account is paid once), not from `paymentTermYears === null` (which conflates
// single-premium with regular open-ended products). Loose param type so both
// `PolicyListItem.policyAccounts` and the full `PolicyAccount[]` satisfy it.
export function isSinglePremium(accounts: { premiumAllocationType: string }[]): boolean {
  return accounts.every((a) => a.premiumAllocationType === 'single');
}
