import { useState } from 'react';
import type { YearRow } from '../lib/illustration';
import { Pagination } from './Pagination';

const PAGE = 10;
const money = (v: number) => `$${Math.round(v).toLocaleString()}`;

export function SurrenderFeeTable({ rows }: { rows: YearRow[] }) {
  const charged = rows.filter((r) => r.surrenderFee > 0);
  const [page, setPage] = useState(0);
  if (charged.length === 0) {
    return <p className="text-sm text-muted">No surrender charge for this policy.</p>;
  }
  const pageCount = Math.ceil(charged.length / PAGE);
  const slice = charged.slice(page * PAGE, page * PAGE + PAGE);
  return (
    <div data-testid="surrender-fee-table">
      <table className="tnum w-full text-left text-sm">
        <thead>
          <tr className="text-xs tracking-wide text-muted uppercase">
            <th className="py-1 pr-4 font-medium">Year</th>
            <th className="py-1 pr-4 font-medium">Net value</th>
            <th className="py-1 pr-4 font-medium">Rate</th>
            <th className="py-1 pr-4 font-medium">Surrender fee</th>
            <th className="py-1 font-medium">Surrender value</th>
          </tr>
        </thead>
        <tbody>
          {slice.map((r) => (
            <tr key={r.year} data-testid="surrender-row" className="border-t border-line">
              <td className="py-1.5 pr-4 text-muted">{r.year}</td>
              <td className="py-1.5 pr-4 text-ink">{money(r.netValue)}</td>
              <td className="py-1.5 pr-4 text-ink">{r.surrenderRate}%</td>
              <td className="py-1.5 pr-4 text-surrender">{money(r.surrenderFee)}</td>
              <td className="py-1.5 text-ink">{money(r.netValue - r.surrenderFee)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} pageCount={pageCount} onPage={setPage} />
    </div>
  );
}
