import { useParams, Link } from 'react-router-dom';
import { usePolicyDetail } from '../hooks/usePolicyDetail';
import { formatMip, formatDomicile } from '../lib/format';

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
        <p className="text-sm text-gray-400">Projection coming in D3/D4.</p>
      )}
    </div>
  );
}
