import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PoliciesTable } from './PoliciesTable'
import type { PolicyListItem } from '../types/policy'

const rows: PolicyListItem[] = [
  { id: 1, name: 'Elite Secure Income', description: 'Single Premium', domicile: 'sgd', paymentTermYears: null, sourceType: 'cash_or_srs', provider: { name: 'AIA' } },
  { id: 2, name: 'ManuInvest Duo', description: 'MIP 20', domicile: 'sgd', paymentTermYears: 20, sourceType: 'cash', provider: { name: 'Manulife' } },
]

describe('PoliciesTable', () => {
  it('renders name, subtext, insurer, and premium type via formatters', () => {
    render(<PoliciesTable policies={rows} onRowClick={() => {}} />)
    expect(screen.getByText('Elite Secure Income')).toBeInTheDocument()
    expect(screen.getByText('SGD · Single premium')).toBeInTheDocument()
    expect(screen.getByText('SGD · 20-year MIP')).toBeInTheDocument()
    expect(screen.getByText('Manulife')).toBeInTheDocument()
    expect(screen.getByText('Single')).toBeInTheDocument()
    expect(screen.getByText('Regular')).toBeInTheDocument()
  })

  it('calls onRowClick with the row id on click', async () => {
    const onRowClick = vi.fn()
    render(<PoliciesTable policies={rows} onRowClick={onRowClick} />)
    await userEvent.click(screen.getByText('ManuInvest Duo'))
    expect(onRowClick).toHaveBeenCalledWith(2)
  })

  it('calls onRowClick when a focused row is activated with Enter', async () => {
    const onRowClick = vi.fn()
    render(<PoliciesTable policies={rows} onRowClick={onRowClick} />)
    const rowButtons = screen.getAllByRole('button')
    rowButtons[0].focus()
    await userEvent.keyboard('{Enter}')
    expect(onRowClick).toHaveBeenCalledWith(1)
  })
})
