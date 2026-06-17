import { useMemo } from 'react';
import type { PolicyDetail } from '../types/policy';
import { runIllustration, type IllustrationResult } from '../lib/illustration';

export type RateKey = 3 | 8;

export function useIllustration(
  detail: PolicyDetail,
  premium: number,
): Record<RateKey, IllustrationResult> {
  return useMemo(
    () => ({
      3: runIllustration(detail, { premium, annualReturnRate: 3 }),
      8: runIllustration(detail, { premium, annualReturnRate: 8 }),
    }),
    [detail, premium],
  );
}
