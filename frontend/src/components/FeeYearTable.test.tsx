import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  it('paginates 10 rows/page', async () => {
    render(<FeeYearTable rows={rows} />);
    expect(screen.getAllByTestId('fee-row')).toHaveLength(10);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.queryByText('11')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('11')).toBeInTheDocument();
  });
});
