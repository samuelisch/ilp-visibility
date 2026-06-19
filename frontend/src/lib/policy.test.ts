import { describe, it, expect } from 'vitest';
import { isSinglePremium } from './policy';

describe('isSinglePremium', () => {
  it('true when every account is single', () => {
    expect(isSinglePremium([{ premiumAllocationType: 'single' }])).toBe(true);
  });
  it('false for recurring or term', () => {
    expect(isSinglePremium([{ premiumAllocationType: 'recurring' }])).toBe(false);
    expect(isSinglePremium([{ premiumAllocationType: 'term' }])).toBe(false);
  });
  it('false when accounts are mixed', () => {
    expect(
      isSinglePremium([
        { premiumAllocationType: 'single' },
        { premiumAllocationType: 'recurring' },
      ]),
    ).toBe(false);
  });
  it('true for an empty account list (vacuous — n/a in real data)', () => {
    expect(isSinglePremium([])).toBe(true);
  });
});
