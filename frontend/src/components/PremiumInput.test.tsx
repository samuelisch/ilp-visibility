import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PremiumInput } from './PremiumInput';

describe('PremiumInput', () => {
  it('allows the draft to be empty while replacing a value', async () => {
    const onChange = vi.fn();
    render(<PremiumInput label="Monthly premium (S$)" value={1000} onChange={onChange} />);
    const input = screen.getByRole('spinbutton');
    const user = userEvent.setup();

    await user.clear(input);
    expect(input).toHaveValue(null);
    await user.type(input, '800');

    expect(input).toHaveValue(800);
    expect(onChange).toHaveBeenLastCalledWith(800);
  });

  it('commits zero when blurred while empty', async () => {
    const onChange = vi.fn();
    render(<PremiumInput label="Monthly premium (S$)" value={1000} onChange={onChange} />);
    const input = screen.getByRole('spinbutton');
    const user = userEvent.setup();

    await user.clear(input);
    await user.tab();

    expect(input).toHaveValue(0);
    expect(onChange).toHaveBeenLastCalledWith(0);
  });
});
