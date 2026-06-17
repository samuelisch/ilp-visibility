import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePolicyDetail } from '../hooks/usePolicyDetail';
import { useIllustration } from '../hooks/useIllustration';
import { summarize } from '../lib/illustration/summarize';
import { omittedFeeNotes } from '../lib/feeDisclosure';
import { FeeGraph } from '../components/FeeGraph';
import { SurrenderGraph } from '../components/SurrenderGraph';
import { formatMip, formatDomicile } from '../lib/format';
import type { PolicyDetail } from '../types/policy';

const money = (v: number) => `$${Math.round(v).toLocaleString()}`;

export function PolicyDetailPage() {
  const { id } = useParams();
  const numericId = Number(id);
  const { data, isLoading, isError } = usePolicyDetail(numericId);

  if (Number.isNaN(numericId)) return <p className="text-red-600">Invalid policy id.</p>;
  if (isLoading) return <p className="text-sm text-gray-500">Loading policy…</p>;
  if (isError || !data) return <p className="text-sm text-red-600">Couldn’t load this policy.</p>;

  // v1 scope: USD and premium-band products are excluded from projection.
  const bandFiltered = data.policyAccounts.some((a) =>
    a.policyAccountFees.some((f) => f.minPremium != null || f.maxPremium != null),
  );
  const outOfScope = data.domicile === 'usd' || bandFiltered;

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm text-blue-600 hover:underline">
        ← All policies
      </Link>
      <header>
        <h1 className="text-xl font-semibold text-gray-900">{data.name}</h1>
        <p className="text-sm text-gray-500">
          {data.provider.name} · {data.description} · {formatDomicile(data.domicile)} ·{' '}
          {formatMip(data.paymentTermYears)}
        </p>
      </header>

      {outOfScope ? (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          This product isn’t available in v1 (USD or premium-band-dependent). Projection is disabled
          to avoid a misleading estimate.
        </p>
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
    <>
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">
            {isSingle ? 'Single premium (S$)' : 'Monthly premium (S$)'}
          </span>
          <input
            type="number"
            min={0}
            value={premium}
            onChange={(e) => setPremium(Number(e.target.value) || 0)}
            className="w-40 rounded-md border border-gray-300 px-3 py-2 focus:outline-none"
          />
        </label>
        <div className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Return</span>
          {([3, 8] as const).map((rk) => (
            <button
              key={rk}
              type="button"
              onClick={() => setRate(rk)}
              className={`mr-2 rounded-md border px-3 py-2 ${
                rate === rk ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
              }`}
            >
              {rk}%
            </button>
          ))}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-gray-500">Net value @ yr 40</dt>
          <dd className="font-medium">{money(summary.valueAt40)}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Total fees @ yr 40</dt>
          <dd className="font-medium">{money(summary.totalFeesAt40)}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Break-even</dt>
          <dd className="font-medium">
            {summary.breakEvenYear ? `Year ${summary.breakEvenYear}` : 'Never (40y)'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Surrender-free from</dt>
          <dd className="font-medium">
            {summary.surrenderFreeFromYear ? `Year ${summary.surrenderFreeFromYear}` : '—'}
          </dd>
        </div>
      </dl>

      <section>
        <h2 className="mb-2 text-sm font-medium text-gray-700">Value vs premiums paid</h2>
        <FeeGraph rows={rows} mipYears={detail.paymentTermYears} />
      </section>
      <section>
        <h2 className="mb-2 text-sm font-medium text-gray-700">Surrender fee vs net value</h2>
        <SurrenderGraph rows={rows} mipYears={detail.paymentTermYears} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-gray-700">Modeled fees</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase">
              <th className="py-1 pr-4">Fee</th>
              <th className="py-1 pr-4">Base</th>
              <th className="py-1">Rate / schedule</th>
            </tr>
          </thead>
          <tbody>
            {allFees.map((f) => (
              <tr key={f.id} className="border-t border-gray-100">
                <td className="py-1 pr-4">{f.description}</td>
                <td className="py-1 pr-4">{f.feeType}</td>
                <td className="py-1">
                  {!f.isFeeAvailable
                    ? 'undisclosed'
                    : f.flatFeeAmount != null
                      ? `$${f.flatFeeAmount}/mo`
                      : f.chargeSchedule === 'term'
                        ? 'year-by-year'
                        : f.chargePercentage != null
                          ? `${f.chargePercentage}% (${f.chargeSchedule})`
                          : f.chargeSchedule}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="border-t border-gray-200 pt-3 text-xs text-gray-500">
        {notes.map((n, i) => (
          <p key={i}>{n}</p>
        ))}
      </footer>
    </>
  );
}
