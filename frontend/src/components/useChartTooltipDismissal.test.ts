import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useChartTooltipDismissal } from './useChartTooltipDismissal';

describe('useChartTooltipDismissal', () => {
  it('dismisses touch tooltips and re-enables hover after interaction', () => {
    const { result } = renderHook(() => useChartTooltipDismissal());

    act(() => window.dispatchEvent(new Event('touchend')));
    expect(result.current.active).toBe(false);

    act(() => result.current.enable());
    expect(result.current.active).toBeUndefined();
  });
});
