import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SurrenderFeeTable } from './SurrenderFeeTable';
import type { YearRow } from '../lib/illustration';

const row = (over: Partial<YearRow>): YearRow => ({
  year: 1,
  premiumsPaid: 0,
  premiumPaidThisYear: 0,
  totalFeesThisYear: 0,
  earningsThisYear: 0,
  grossValue: 0,
  netValue: 10000,
  surrenderFee: 0,
  surrenderRate: 0,
  ...over,
});

describe('SurrenderFeeTable', () => {
  it('shows only charge-years and computes surrender value', () => {
    const rows = [
      row({ year: 1, netValue: 1000, surrenderFee: 80, surrenderRate: 8 }),
      row({ year: 2, netValue: 2000, surrenderFee: 120, surrenderRate: 6 }),
      row({ year: 3, netValue: 3000, surrenderFee: 120, surrenderRate: 4 }),
      row({ year: 4, netValue: 4000, surrenderFee: 0, surrenderRate: 0 }),
    ];
    render(<SurrenderFeeTable rows={rows} />);
    expect(screen.getAllByTestId('surrender-row')).toHaveLength(3);
    expect(screen.getByText('$920')).toBeInTheDocument(); // 1000 - 80
  });
  it('shows a message when there is no surrender charge', () => {
    render(<SurrenderFeeTable rows={[row({})]} />);
    expect(screen.getByText(/No surrender charge/i)).toBeInTheDocument();
  });
});
