import { describe, it, expect } from 'vitest';
import { summarize } from './summarize';
import type { YearRow } from './types';

const rows: YearRow[] = Array.from({ length: 40 }, (_, i) => ({
  year: i + 1,
  premiumsPaid: 1000 * (i + 1),
  premiumPaidThisYear: 1000,
  totalFeesThisYear: 50,
  earningsThisYear: 0,
  grossValue: 1100 * (i + 1),
  netValue: 1050 * (i + 1),
  surrenderFee: i < 5 ? 100 : 0,
  surrenderRate: i < 5 ? 10 : 0,
}));

describe('summarize', () => {
  it('reports value@40, total fees@40 (nominal), break-even, surrender-free year', () => {
    const s = summarize(rows);
    expect(s.valueAt40).toBe(rows[39].netValue);
    expect(s.totalFeesAt40).toBeCloseTo(
      rows.reduce((a, r) => a + r.totalFeesThisYear, 0), // 40 × 50 = 2000
      6,
    );
    expect(s.breakEvenYear).toBe(1);
    expect(s.surrenderFreeFromYear).toBe(6); // charged yrs 1–5, free from 6
  });

  it('returns null surrender-free for a policy that never charges', () => {
    const noCharge = rows.map((r) => ({ ...r, surrenderFee: 0, surrenderRate: 0 }));
    expect(summarize(noCharge).surrenderFreeFromYear).toBeNull();
  });
});
