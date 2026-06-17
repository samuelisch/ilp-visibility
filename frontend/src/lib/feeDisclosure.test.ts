import { describe, it, expect } from 'vitest';
import { omittedFeeNotes } from './feeDisclosure';
import type { PolicyDetail, PolicyAccountFee } from '../types/policy';

const fee = (o: Partial<PolicyAccountFee>): PolicyAccountFee => ({
  id: 1,
  description: 'F',
  chargeSchedule: 'perpetual',
  activeFromPolicyYear: 1,
  termEndBehaviour: null,
  recurringLength: null,
  feeType: 'account_value',
  notionalPercentage: null,
  isFeeAvailable: true,
  chargePercentage: '1.00',
  flatFeeAmount: null,
  minPremium: null,
  maxPremium: null,
  policyAccountFeeTerms: [],
  ...o,
});
const detail = (fees: PolicyAccountFee[]): PolicyDetail => ({
  id: 1,
  name: 'P',
  description: 'd',
  domicile: 'sgd',
  paymentTermYears: 20,
  sourceType: 'cash',
  provider: { name: 'X' },
  policyAccounts: [
    {
      id: 1,
      description: 'a',
      allocationFromPolicyYear: 1,
      allocationTillPolicyYear: null,
      premiumChargePercentage: '5.00',
      premiumAllocationType: 'recurring',
      termEndBehaviour: null,
      policyAccountPremiumAllocationTerms: [],
      policyAccountFees: fees,
      policyAccountSurrenderFees: [],
    },
  ],
  policyAccountFees: [],
  policyAccountSurrenderFees: [],
});

describe('omittedFeeNotes', () => {
  it('always names COI + fund-layer', () => {
    expect(omittedFeeNotes(detail([fee({})]))[0]).toMatch(/COI|insurance/i);
  });
  it('names undisclosed-rate fees', () => {
    const notes = omittedFeeNotes(
      detail([fee({ description: 'Supplementary Charge', isFeeAvailable: false })]),
    );
    expect(notes.some((n) => n.includes('Supplementary Charge'))).toBe(true);
  });
  it('names basic_sum_assured fees', () => {
    const notes = omittedFeeNotes(
      detail([fee({ description: 'Policy Fee', feeType: 'basic_sum_assured' })]),
    );
    expect(notes.some((n) => n.includes('Policy Fee'))).toBe(true);
  });
});
