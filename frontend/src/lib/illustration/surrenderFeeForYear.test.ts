import { describe, it, expect } from 'vitest';
import { surrenderFeeForYear } from './surrenderFeeForYear';
import type { PolicyAccountSurrenderFee } from '../../types/policy';

const sf = (over: Partial<PolicyAccountSurrenderFee>): PolicyAccountSurrenderFee => ({
  id: 1,
  feeType: 'account_value',
  termEndBehaviour: 'stop',
  policyAccountSurrenderFeeTerms: [
    { policyYear: 1, chargePercentage: '12.00' },
    { policyYear: 2, chargePercentage: '6.00' },
  ],
  ...over,
});

describe('surrenderFeeForYear', () => {
  it('rate × account value for the year', () => {
    expect(
      surrenderFeeForYear([sf({})], {
        policyYear: 1,
        accountValue: 10000,
        cumulativePremiumsPaid: 9000,
      }),
    ).toBeCloseTo(1200, 6);
  });
  it('0 after the schedule ends (stop)', () => {
    expect(
      surrenderFeeForYear([sf({})], {
        policyYear: 5,
        accountValue: 10000,
        cumulativePremiumsPaid: 9000,
      }),
    ).toBe(0);
  });
  it('cumulative_premium_paid base', () => {
    const f = sf({ feeType: 'cumulative_premium_paid' });
    expect(
      surrenderFeeForYear([f], {
        policyYear: 1,
        accountValue: 10000,
        cumulativePremiumsPaid: 9000,
      }),
    ).toBeCloseTo(1080, 6);
  });
  it('no surrender fees → 0', () => {
    expect(
      surrenderFeeForYear([], { policyYear: 1, accountValue: 10000, cumulativePremiumsPaid: 9000 }),
    ).toBe(0);
  });
});
