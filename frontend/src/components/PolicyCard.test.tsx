import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PolicyCard } from './PolicyCard';
import type { PolicyListItem } from '../types/policy';

const policy: PolicyListItem = {
  id: 2,
  name: 'ManuInvest Duo',
  description: 'MIP 20',
  domicile: 'sgd',
  paymentTermYears: 20,
  sourceType: 'cash',
  provider: { name: 'Manulife' },
  policyAccounts: [{ premiumAllocationType: 'recurring' }],
};

describe('PolicyCard', () => {
  it('renders provider, name, and pills', () => {
    render(<PolicyCard policy={policy} onClick={() => {}} />);
    expect(screen.getByText('ManuInvest Duo')).toBeInTheDocument();
    expect(screen.getByText('Manulife')).toBeInTheDocument();
    expect(screen.queryByText(policy.description)).not.toBeInTheDocument();
    expect(screen.getByText('Regular')).toBeInTheDocument();
    expect(screen.getByText('SGD')).toBeInTheDocument();
    expect(screen.getByText('20-year MIP')).toBeInTheDocument();
    expect(screen.getByText('Cash')).toBeInTheDocument();
  });
  it('labels a regular open-ended policy (recurring + no fixed term) as Regular / Open-ended', () => {
    const openEnded: PolicyListItem = {
      ...policy,
      paymentTermYears: null,
      policyAccounts: [{ premiumAllocationType: 'recurring' }],
    };
    render(<PolicyCard policy={openEnded} onClick={() => {}} />);
    expect(screen.getByText('Regular')).toBeInTheDocument();
    expect(screen.getByText('Open-ended')).toBeInTheDocument();
  });
  it('calls onClick with id on click and on Enter', async () => {
    const onClick = vi.fn();
    render(<PolicyCard policy={policy} onClick={onClick} />);
    await userEvent.click(screen.getByTestId('policy-card'));
    expect(onClick).toHaveBeenCalledWith(2);
    onClick.mockClear();
    screen.getByTestId('policy-card').focus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledWith(2);
  });
});
