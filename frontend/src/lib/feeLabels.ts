import type { FeeType, ChargeSchedule } from '../types/policy';

const FEE_BASE: Record<FeeType, string> = {
  account_value: 'Account value',
  annual_premium: 'Annual premium',
  cumulative_premium_paid: 'Premiums paid so far',
  notional_premium: 'Notional premium',
  basic_sum_assured: 'Sum assured',
};

const CHARGE_SCHEDULE: Record<ChargeSchedule, string> = {
  perpetual: 'every year',
  recurring: 'for a fixed period',
  term: 'year-by-year',
  escalating_n: 'escalating',
};

export const formatFeeBase = (t: FeeType): string => FEE_BASE[t];
export const formatChargeSchedule = (s: ChargeSchedule): string => CHARGE_SCHEDULE[s];
