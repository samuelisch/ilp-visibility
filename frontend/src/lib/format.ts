import type { Domicile, PolicyListItem, SourceType } from '../types/policy';
import { isSinglePremium } from './policy';

export function formatDomicile(domicile: Domicile): string {
  switch (domicile) {
    case 'sgd':
      return 'SGD';
    case 'usd':
      return 'USD';
  }
}

export function formatPremiumType(isSingle: boolean): string {
  return isSingle ? 'Single' : 'Regular';
}

export function formatMip(isSingle: boolean, paymentTermYears: number | null): string {
  if (isSingle) return 'Single premium';
  return paymentTermYears === null ? 'Open-ended' : `${paymentTermYears}-year MIP`;
}

export function formatProductSubtext(policy: PolicyListItem): string {
  const single = isSinglePremium(policy.policyAccounts);
  return `${formatDomicile(policy.domicile)} · ${formatMip(single, policy.paymentTermYears)}`;
}

export function formatSourceType(sourceType: SourceType): string {
  switch (sourceType) {
    case 'cash':
      return 'Cash';
    case 'cash_or_srs':
      return 'Cash / SRS';
    case 'cpfis':
      return 'CPFIS';
  }
}

export function formatMoney(v: number): string {
  return `$${Math.round(v).toLocaleString()}`;
}
