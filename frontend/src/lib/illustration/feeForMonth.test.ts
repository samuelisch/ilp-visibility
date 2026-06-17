import { describe, it, expect } from 'vitest';
import { feeForMonth } from './feeForMonth';
import type { PolicyAccountFee } from '../../types/policy';
import type { FeeContext } from './types';

const baseFee = (over: Partial<PolicyAccountFee>): PolicyAccountFee => ({
  id: 1,
  description: 'f',
  chargeSchedule: 'perpetual',
  activeFromPolicyYear: 1,
  termEndBehaviour: null,
  recurringLength: null,
  feeType: 'account_value',
  notionalPercentage: null,
  isFeeAvailable: true,
  chargePercentage: '1.20',
  flatFeeAmount: null,
  minPremium: null,
  maxPremium: null,
  policyAccountFeeTerms: [],
  ...over,
});
const ctx = (over: Partial<FeeContext>): FeeContext => ({
  policyYear: 1,
  accountValue: 12000,
  annualisedPremium: 4800,
  cumulativePremiumsPaid: 4800,
  notionalBase: 5000,
  paymentTermYears: 20,
  ...over,
});

describe('feeForMonth', () => {
  it('account_value perpetual = (rate/12) × value', () => {
    expect(feeForMonth(baseFee({}), ctx({}))).toBeCloseTo((1.2 / 100 / 12) * 12000, 6);
  });
  it('not yet active → 0', () => {
    expect(feeForMonth(baseFee({ activeFromPolicyYear: 3 }), ctx({ policyYear: 2 }))).toBe(0);
  });
  it('recurring stops after activeFrom + recurringLength - 1', () => {
    const f = baseFee({ chargeSchedule: 'recurring', recurringLength: 5 });
    expect(feeForMonth(f, ctx({ policyYear: 5 }))).toBeGreaterThan(0);
    expect(feeForMonth(f, ctx({ policyYear: 6 }))).toBe(0);
  });
  it('annual_premium uses annualisedPremium', () => {
    const f = baseFee({ feeType: 'annual_premium', chargePercentage: '6.00' });
    expect(feeForMonth(f, ctx({}))).toBeCloseTo((6 / 100 / 12) * 4800, 6);
  });
  it('cumulative_premium_paid uses premiums paid', () => {
    const f = baseFee({ feeType: 'cumulative_premium_paid', chargePercentage: '2.18' });
    expect(feeForMonth(f, ctx({ cumulativePremiumsPaid: 10000 }))).toBeCloseTo(
      (2.18 / 100 / 12) * 10000,
      6,
    );
  });
  it('notional_premium uses notionalBase', () => {
    const f = baseFee({
      feeType: 'notional_premium',
      chargePercentage: '2.18',
      notionalPercentage: '6.00',
    });
    expect(feeForMonth(f, ctx({ notionalBase: 50000 }))).toBeCloseTo((2.18 / 100 / 12) * 50000, 6);
  });
  it('term uses the year row; persist_last continues after last row', () => {
    const f = baseFee({
      chargeSchedule: 'term',
      feeType: 'account_value',
      chargePercentage: null,
      termEndBehaviour: 'persist_last',
      policyAccountFeeTerms: [
        { policyYear: 1, chargePercentage: '2.00' },
        { policyYear: 2, chargePercentage: '1.00' },
      ],
    });
    expect(feeForMonth(f, ctx({ policyYear: 2 }))).toBeCloseTo((1 / 100 / 12) * 12000, 6);
    expect(feeForMonth(f, ctx({ policyYear: 5 }))).toBeCloseTo((1 / 100 / 12) * 12000, 6); // persists
  });
  it('term with stop → 0 after last row', () => {
    const f = baseFee({
      chargeSchedule: 'term',
      chargePercentage: null,
      termEndBehaviour: 'stop',
      policyAccountFeeTerms: [{ policyYear: 1, chargePercentage: '2.00' }],
    });
    expect(feeForMonth(f, ctx({ policyYear: 3 }))).toBe(0);
  });
  it('escalating_n = (rate/12) × annualisedPremium × min(year, paymentTerm)', () => {
    const f = baseFee({
      chargeSchedule: 'escalating_n',
      feeType: 'annual_premium',
      chargePercentage: '0.70',
      recurringLength: null,
    });
    expect(feeForMonth(f, ctx({ policyYear: 5, paymentTermYears: 20 }))).toBeCloseTo(
      (0.7 / 100 / 12) * 4800 * 5,
      6,
    );
    expect(feeForMonth(f, ctx({ policyYear: 25, paymentTermYears: 20 }))).toBeCloseTo(
      (0.7 / 100 / 12) * 4800 * 20,
      6,
    ); // capped at PPT
  });
  it('escalating_n stops after recurringLength', () => {
    const f = baseFee({
      chargeSchedule: 'escalating_n',
      feeType: 'annual_premium',
      chargePercentage: '0.70',
      recurringLength: 8,
    });
    expect(feeForMonth(f, ctx({ policyYear: 9 }))).toBe(0);
  });
  it('flatFeeAmount → flat dollars when active', () => {
    const f = baseFee({ flatFeeAmount: '5.00', chargePercentage: null });
    expect(feeForMonth(f, ctx({}))).toBe(5);
  });
  it('excluded: isFeeAvailable=false and basic_sum_assured → 0', () => {
    expect(feeForMonth(baseFee({ isFeeAvailable: false }), ctx({}))).toBe(0);
    expect(feeForMonth(baseFee({ feeType: 'basic_sum_assured' }), ctx({}))).toBe(0);
  });
});
