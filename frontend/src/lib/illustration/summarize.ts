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
  // Nominal fees actually deducted, summed — reconciles with FeeYearTable.
  // (grossValue − netValue would also include forgone growth on those fees.)
  const totalFeesAt40 = rows.reduce((sum, r) => sum + r.totalFeesThisYear, 0);
  // Only meaningful once a charge has existed: a policy that never charges is
  // "free from the start" (→ null → "—"), not "free from year 1".
  const everCharged = rows.some((r) => r.surrenderFee > 0);
  const sf = everCharged ? rows.find((r) => r.surrenderFee === 0) : undefined;
  return {
    valueAt40: last.netValue,
    totalFeesAt40,
    breakEvenYear: be ? be.year : null,
    surrenderFreeFromYear: sf ? sf.year : null,
  };
}
