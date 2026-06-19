import type { YearRow } from './types';

export interface Summary {
  accountValueAtEnd: number;
  totalFeesAtEnd: number;
  surrenderFeeEndYear: number | null;
}

export function summarize(rows: YearRow[]): Summary {
  const last = rows[rows.length - 1];
  const totalFeesAtEnd = rows.reduce((sum, r) => sum + r.totalFeesThisYear, 0);
  const everCharged = rows.some((r) => r.surrenderFee > 0);
  const sf = everCharged ? rows.find((r) => r.surrenderFee === 0) : undefined;

  return {
    accountValueAtEnd: last.netValue,
    totalFeesAtEnd,
    surrenderFeeEndYear: sf ? sf.year : null,
  };
}
