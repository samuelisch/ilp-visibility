import { describe, it, expect } from 'vitest';
import { formatFeeBase, formatChargeSchedule } from './feeLabels';
import type { FeeType, ChargeSchedule } from '../types/policy';

const FEE_TYPES: FeeType[] = [
  'account_value',
  'annual_premium',
  'cumulative_premium_paid',
  'notional_premium',
  'basic_sum_assured',
];
const SCHEDULES: ChargeSchedule[] = ['perpetual', 'recurring', 'term', 'escalating_n'];

describe('feeLabels', () => {
  it('every fee base maps to a non-empty, jargon-free label', () => {
    for (const t of FEE_TYPES) {
      const label = formatFeeBase(t);
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toMatch(/_/);
    }
  });
  it('every charge schedule maps to a non-empty, jargon-free label', () => {
    for (const s of SCHEDULES) {
      const label = formatChargeSchedule(s);
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toMatch(/_/);
    }
  });
});
