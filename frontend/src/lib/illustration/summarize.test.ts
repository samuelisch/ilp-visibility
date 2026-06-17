import { describe, it, expect } from 'vitest';
import { summarize } from './summarize';
import type { YearRow } from './types';

const rows: YearRow[] = Array.from({ length: 40 }, (_, i) => ({
  year: i + 1,
  premiumsPaid: 1000 * (i + 1),
  grossValue: 1100 * (i + 1),
  netValue: 1050 * (i + 1),
  surrenderFee: i < 5 ? 100 : 0,
}));

describe('summarize', () => {
  it('reports value@40, total fees@40, break-even, surrender-free year', () => {
    const s = summarize(rows);
    expect(s.valueAt40).toBe(rows[39].netValue);
    expect(s.totalFeesAt40).toBeCloseTo(rows[39].grossValue - rows[39].netValue, 6);
    expect(s.breakEvenYear).toBe(1); // net >= premiums from yr 1 here
    expect(s.surrenderFreeFromYear).toBe(6); // first year surrenderFee === 0
  });
});
