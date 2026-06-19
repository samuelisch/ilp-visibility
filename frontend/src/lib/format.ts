import type { Domicile, PolicyListItem, SourceType } from '../types/policy';

export function formatDomicile(domicile: Domicile): string {
  switch (domicile) {
    case 'sgd':
      return 'SGD';
    case 'usd':
      return 'USD';
  }
}

// `paymentTermYears === null` means a single-premium product (no recurring MIP).
export function formatMip(paymentTermYears: number | null): string {
  return paymentTermYears === null ? 'Single premium' : `${paymentTermYears}-year MIP`;
}

export function formatPremiumType(paymentTermYears: number | null): string {
  return paymentTermYears === null ? 'Single' : 'Regular';
}

// Subtext under the policy name, e.g. "SGD · 25-year MIP" / "SGD · Single premium".
export function formatProductSubtext(policy: PolicyListItem): string {
  return `${formatDomicile(policy.domicile)} · ${formatMip(policy.paymentTermYears)}`;
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
