import { describe, it, expect } from 'vitest';
import { runIllustration } from './runIllustration';
import type { PolicyDetail, PolicyAccount } from '../../types/policy';

const account = (over: Partial<PolicyAccount>): PolicyAccount => ({
  id: 1,
  description: 'main',
  allocationFromPolicyYear: 1,
  allocationTillPolicyYear: null,
  premiumChargePercentage: '5.00',
  premiumAllocationType: 'recurring',
  termEndBehaviour: null,
  policyAccountPremiumAllocationTerms: [],
  policyAccountFees: [],
  policyAccountSurrenderFees: [],
  ...over,
});
const policy = (over: Partial<PolicyDetail>): PolicyDetail => ({
  id: 1,
  name: 'P',
  description: 'MIP 20',
  domicile: 'sgd',
  paymentTermYears: 20,
  sourceType: 'cash',
  provider: { name: 'X' },
  policyAccounts: [account({})],
  policyAccountFees: [],
  policyAccountSurrenderFees: [],
  ...over,
});

describe('runIllustration', () => {
  it('produces 40 year rows', () => {
    const { byYear } = runIllustration(policy({}), { premium: 400, annualReturnRate: 3 });
    expect(byYear).toHaveLength(40);
    expect(byYear[0].year).toBe(1);
    expect(byYear[39].year).toBe(40);
  });
  it('premiumsPaid plateaus at the payment term (monthly regular)', () => {
    const { byYear } = runIllustration(policy({}), { premium: 400, annualReturnRate: 3 });
    expect(byYear[19].premiumsPaid).toBeCloseTo(400 * 12 * 20, 4); // paid through yr 20
    expect(byYear[39].premiumsPaid).toBeCloseTo(400 * 12 * 20, 4); // no more after
  });
  it('net < gross when fees exist (premium charge alone suffices)', () => {
    const { byYear } = runIllustration(policy({}), { premium: 400, annualReturnRate: 3 });
    expect(byYear[10].netValue).toBeLessThan(byYear[10].grossValue);
  });
  it('single premium pays once', () => {
    const sp = policy({
      paymentTermYears: null,
      policyAccounts: [
        account({ premiumAllocationType: 'single', premiumChargePercentage: '3.00' }),
      ],
    });
    const { byYear } = runIllustration(sp, { premium: 10000, annualReturnRate: 3 });
    expect(byYear[0].premiumsPaid).toBe(10000);
    expect(byYear[39].premiumsPaid).toBe(10000);
  });
  it('surrender fee falls to zero after the schedule ends', () => {
    const withSurrender = policy({
      policyAccounts: [
        account({
          policyAccountSurrenderFees: [
            {
              id: 1,
              feeType: 'account_value',
              termEndBehaviour: 'stop',
              policyAccountSurrenderFeeTerms: [
                { policyYear: 1, chargePercentage: '5.00' },
                { policyYear: 2, chargePercentage: '3.00' },
              ],
            },
          ],
        }),
      ],
    });
    const { byYear } = runIllustration(withSurrender, { premium: 400, annualReturnRate: 3 });
    expect(byYear[0].surrenderFee).toBeGreaterThan(0);
    expect(byYear[10].surrenderFee).toBe(0);
  });
});
