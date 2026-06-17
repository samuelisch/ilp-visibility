import type { YearRow } from './types';

export interface Summary {
  valueAt40: number;
  totalFeesAt40: number;
  breakEvenYear: number | null;
  surrenderFreeFromYear: number | null;
}

export function summarize(rows: YearRow[]): Summary {
  const last = rows[rows.length - 1];
  const be = rows.find((r) => r.netValue >= r.premiumsPaid);
  const sf = rows.find((r) => r.surrenderFee === 0);
  return {
    valueAt40: last.netValue,
    totalFeesAt40: last.grossValue - last.netValue,
    breakEvenYear: be ? be.year : null,
    surrenderFreeFromYear: sf ? sf.year : null,
  };
}
