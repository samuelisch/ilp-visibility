import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeeYearTable } from './FeeYearTable';
import type { YearRow } from '../lib/illustration';

const rows: YearRow[] = Array.from({ length: 40 }, (_, i) => ({
  year: i + 1,
  premiumsPaid: 0,
  premiumPaidThisYear: 4800,
  totalFeesThisYear: 100,
  earningsThisYear: 50,
  grossValue: 1000 * (i + 1),
  netValue: 950 * (i + 1),
  surrenderFee: 0,
  surrenderRate: 0,
}));

describe('FeeYearTable', () => {
  it('renders every year in a scroll viewport (no pagination)', () => {
    render(<FeeYearTable rows={rows} />);
    expect(screen.getAllByTestId('fee-row')).toHaveLength(40);
    expect(screen.getByText('11')).toBeInTheDocument(); // year 11 in the DOM, no Next click
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });
});
