import { describe, it, expect } from 'vitest';
import {
  formatDomicile,
  formatMip,
  formatPremiumType,
  formatProductSubtext,
  formatSourceType,
} from './format';
import type { PolicyListItem } from '../types/policy';

describe('formatDomicile', () => {
  it('maps sgd/usd to upper-case labels', () => {
    expect(formatDomicile('sgd')).toBe('SGD');
    expect(formatDomicile('usd')).toBe('USD');
  });
});

describe('formatMip', () => {
  it('single → Single premium', () => {
    expect(formatMip(true, null)).toBe('Single premium');
  });
  it('regular + fixed term → N-year MIP', () => {
    expect(formatMip(false, 20)).toBe('20-year MIP');
  });
  it('regular + no fixed term → Open-ended (the bug being fixed)', () => {
    expect(formatMip(false, null)).toBe('Open-ended');
  });
});

describe('formatPremiumType', () => {
  it('single → Single, regular → Regular', () => {
    expect(formatPremiumType(true)).toBe('Single');
    expect(formatPremiumType(false)).toBe('Regular');
  });
});

describe('formatSourceType', () => {
  it('maps all three funding sources to human labels', () => {
    expect(formatSourceType('cash')).toBe('Cash');
    expect(formatSourceType('cash_or_srs')).toBe('Cash / SRS');
    expect(formatSourceType('cpfis')).toBe('CPFIS');
  });
});

describe('formatProductSubtext', () => {
  const base: PolicyListItem = {
    id: 1,
    name: 'X',
    description: 'Y',
    domicile: 'sgd',
    paymentTermYears: 25,
    sourceType: 'cash',
    provider: { name: 'AIA' },
    policyAccounts: [{ premiumAllocationType: 'recurring' }],
  };
  it('composes "{DOMICILE} · {MIP}" by premium nature', () => {
    expect(formatProductSubtext(base)).toBe('SGD · 25-year MIP');
    expect(formatProductSubtext({ ...base, paymentTermYears: null })).toBe('SGD · Open-ended');
    expect(
      formatProductSubtext({
        ...base,
        paymentTermYears: null,
        policyAccounts: [{ premiumAllocationType: 'single' }],
      }),
    ).toBe('SGD · Single premium');
  });
});
