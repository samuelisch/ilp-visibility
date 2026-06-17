import type { PolicyListItem } from '../types/policy';
import { formatPremiumType, formatDomicile, formatMip } from '../lib/format';
import { Card } from './ui/Card';
import { Pill } from './ui/Pill';

export function PolicyCard({
  policy,
  onClick,
}: {
  policy: PolicyListItem;
  onClick: (id: number) => void;
}) {
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
        className="cursor-pointer focus:outline-none"
      >
        <div className="text-xs tracking-wide text-muted uppercase">{policy.provider.name}</div>
        <div className="font-display text-lg text-ink">{policy.name}</div>
        <div className="mt-0.5 text-sm text-muted">{policy.description}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill tone="accent">{formatPremiumType(policy.paymentTermYears)}</Pill>
          <Pill>{formatDomicile(policy.domicile)}</Pill>
          <Pill>{formatMip(policy.paymentTermYears)}</Pill>
        </div>
      </div>
    </Card>
  );
}
