import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePolicyDetail } from '../hooks/usePolicyDetail';
import { useIllustration } from '../hooks/useIllustration';
import { summarize } from '../lib/illustration/summarize';
import { omittedFeeNotes } from '../lib/feeDisclosure';
import { FeeGraph } from '../components/FeeGraph';
import { SurrenderGraph } from '../components/SurrenderGraph';
import { FeeYearTable } from '../components/FeeYearTable';
import { SurrenderFeeTable } from '../components/SurrenderFeeTable';
import { formatMip, formatDomicile, formatSourceType } from '../lib/format';
import { formatFeeBase, formatChargeSchedule } from '../lib/feeLabels';
import { Card } from '../components/ui/Card';
import { Pill } from '../components/ui/Pill';
import { Field, inputClass } from '../components/ui/Field';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { StatCard } from '../components/ui/StatCard';
import type { PolicyDetail } from '../types/policy';

const money = (v: number) => `$${Math.round(v).toLocaleString()}`;

export function PolicyDetailPage() {
  const { id } = useParams();
  const numericId = Number(id);
  const { data, isLoading, isError } = usePolicyDetail(numericId);

  if (Number.isNaN(numericId)) return <p className="text-accent">Invalid policy id.</p>;
  if (isLoading) return <p className="text-sm text-muted">Loading policy…</p>;
  if (isError || !data) return <p className="text-sm text-accent">Couldn’t load this policy.</p>;

  // v1 scope: USD and premium-band products are excluded from projection.
  const bandFiltered = data.policyAccounts.some((a) =>
    a.policyAccountFees.some((f) => f.minPremium != null || f.maxPremium != null),
  );
  const outOfScope = data.domicile === 'usd' || bandFiltered;

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm text-accent hover:underline">
        ← All policies
      </Link>
      <header>
        <h1 className="font-display text-2xl text-ink">{data.name}</h1>
        <p className="text-sm text-muted">
          {data.provider.name} · {data.description} · {formatDomicile(data.domicile)} ·{' '}
          {formatSourceType(data.sourceType)} · {formatMip(data.paymentTermYears)}
        </p>
      </header>

      {outOfScope ? (
        <Card className="border-accent-soft bg-accent-soft/50 text-ink">
          This product isn’t available in v1 (USD or premium-band-dependent). Projection is disabled
          to avoid a misleading estimate.
        </Card>
      ) : (
        // Body lives in its own component so the engine hooks run unconditionally
        // (after the early returns above, hooks here would violate the Rules of Hooks).
        <PolicyProjection detail={data} />
      )}
    </div>
  );
}

function PolicyProjection({ detail }: { detail: PolicyDetail }) {
  const isSingle = detail.policyAccounts.every((a) => a.premiumAllocationType === 'single');
  const [premium, setPremium] = useState(isSingle ? 10000 : 400);
  const [rate, setRate] = useState<3 | 8>(3);
  const results = useIllustration(detail, premium);
  const rows = results[rate].byYear;
  const summary = summarize(rows);
  const notes = omittedFeeNotes(detail);
  const allFees = [
    ...detail.policyAccounts.flatMap((a) => a.policyAccountFees),
    ...detail.policyAccountFees,
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <Field label={isSingle ? 'Single premium (S$)' : 'Monthly premium (S$)'} className="w-40">
          <input
            type="number"
            min={0}
            value={premium}
            onChange={(e) => setPremium(Number(e.target.value) || 0)}
            className={`${inputClass} tnum`}
          />
        </Field>
        <div className="text-sm">
          <span className="mb-1 block font-medium text-muted">Return</span>
          <SegmentedControl
            options={[
              { value: '3', label: '3%' },
              { value: '8', label: '8%' },
            ]}
            value={String(rate)}
            onChange={(v) => setRate(Number(v) as 3 | 8)}
          />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Net value @ yr 40" value={money(summary.valueAt40)} />
        <StatCard label="Total fees @ yr 40" value={money(summary.totalFeesAt40)} />
        <StatCard
          label="Break-even"
          value={summary.breakEvenYear ? `Year ${summary.breakEvenYear}` : 'Never (40y)'}
        />
        <StatCard
          label="Surrender-free from"
          value={summary.surrenderFreeFromYear ? `Year ${summary.surrenderFreeFromYear}` : '—'}
        />
      </dl>

      <section>
        <h2 className="mb-2 font-display text-lg text-ink">Value vs premiums paid</h2>
        <Card>
          <FeeGraph rows={rows} mipYears={detail.paymentTermYears} />
        </Card>
      </section>
      <section>
        <h2 className="mb-2 font-display text-lg text-ink">Year-by-year fees</h2>
        <FeeYearTable rows={rows} />
      </section>
      <section>
        <h2 className="mb-2 font-display text-lg text-ink">Surrender fee vs net value</h2>
        <Card>
          <SurrenderGraph rows={rows} mipYears={detail.paymentTermYears} />
        </Card>
      </section>
      <section>
        <h2 className="mb-2 font-display text-lg text-ink">Surrender charge by year</h2>
        <SurrenderFeeTable rows={rows} />
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg text-ink">Modeled fees</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs tracking-wide text-muted uppercase">
              <th className="py-1 pr-4 font-medium">Fee</th>
              <th className="py-1 pr-4 font-medium">Base</th>
              <th className="py-1 font-medium">Rate / schedule</th>
            </tr>
          </thead>
          <tbody>
            {allFees.map((f) => (
              <tr key={f.id} className="border-t border-line">
                <td className="py-1.5 pr-4 text-ink">{f.description}</td>
                <td className="py-1.5 pr-4 text-muted">
                  {f.flatFeeAmount != null ? 'Flat fee' : formatFeeBase(f.feeType)}
                </td>
                <td className="tnum py-1.5 text-ink">
                  {!f.isFeeAvailable ? (
                    <Pill>undisclosed</Pill>
                  ) : f.flatFeeAmount != null ? (
                    `$${f.flatFeeAmount}/mo`
                  ) : f.chargeSchedule === 'term' ? (
                    formatChargeSchedule('term')
                  ) : f.chargePercentage != null ? (
                    `${f.chargePercentage}% · ${formatChargeSchedule(f.chargeSchedule)}`
                  ) : (
                    formatChargeSchedule(f.chargeSchedule)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Card className="bg-accent-soft/50 text-xs text-muted">
        {notes.map((n, i) => (
          <p key={i} className={i > 0 ? 'mt-1' : ''}>
            {n}
          </p>
        ))}
      </Card>
    </div>
  );
}
