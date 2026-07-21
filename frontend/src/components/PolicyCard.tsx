import type { PolicyListItem } from '../types/policy';
import { formatPremiumType, formatDomicile, formatMip, formatSourceType } from '../lib/format';
import { isSinglePremium } from '../lib/policy';
import { Card } from './ui/Card';
import { Pill } from './ui/Pill';

export function PolicyCard({
  policy,
  onClick,
}: {
  policy: PolicyListItem;
  onClick: (id: number) => void;
}) {
  const single = isSinglePremium(policy.policyAccounts);
  return (
    <Card interactive>
      <div
        role="button"
        tabIndex={0}
        data-testid="policy-card"
        onClick={() => onClick(policy.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(policy.id);
          }
        }}
        className="cursor-pointer"
      >
        <div className="text-xs tracking-wide text-muted uppercase">{policy.provider.name}</div>
        <div className="font-display text-lg text-ink">{policy.name}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill tone="accent">{formatPremiumType(single)}</Pill>
          <Pill>{formatDomicile(policy.domicile)}</Pill>
          <Pill>{formatMip(single, policy.paymentTermYears)}</Pill>
          <Pill>{formatSourceType(policy.sourceType)}</Pill>
        </div>
      </div>
    </Card>
  );
}
