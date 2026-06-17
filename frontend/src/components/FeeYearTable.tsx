import type { YearRow } from '../lib/illustration';

const money = (v: number) => `$${Math.round(v).toLocaleString()}`;

export function FeeYearTable({ rows }: { rows: YearRow[] }) {
  return (
    <div data-testid="fee-year-table" className="max-h-[22rem] overflow-y-auto">
      <table className="tnum w-full text-left text-sm">
        <thead>
          <tr className="text-xs tracking-wide text-muted uppercase">
            <th className="sticky top-0 bg-surface py-1 pr-4 font-medium">Year</th>
            <th className="sticky top-0 bg-surface py-1 pr-4 font-medium">Premium paid</th>
            <th className="sticky top-0 bg-surface py-1 pr-4 font-medium">Total fees</th>
            <th className="sticky top-0 bg-surface py-1 pr-4 font-medium">Gross value</th>
            <th className="sticky top-0 bg-surface py-1 pr-4 font-medium">Net value</th>
            <th className="sticky top-0 bg-surface py-1 font-medium">Earnings</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year} data-testid="fee-row" className="border-t border-line">
              <td className="py-1.5 pr-4 text-muted">{r.year}</td>
              <td className="py-1.5 pr-4 text-ink">{money(r.premiumPaidThisYear)}</td>
              <td className="py-1.5 pr-4 text-ink">{money(r.totalFeesThisYear)}</td>
              <td className="py-1.5 pr-4 text-ink">{money(r.grossValue)}</td>
              <td className="py-1.5 pr-4 text-ink">{money(r.netValue)}</td>
              <td className="py-1.5 text-ink">{money(r.earningsThisYear)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
