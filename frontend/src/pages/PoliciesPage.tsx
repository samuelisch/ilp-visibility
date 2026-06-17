import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePolicies } from '../hooks/usePolicies';
import { PoliciesTable } from '../components/PoliciesTable';
import {
  selectVisibleRows,
  deriveProviderOptions,
  ALL_PROVIDERS,
  type SortField,
  type SortDir,
} from '../lib/policies';

const SORT_OPTIONS: {
  value: string;
  label: string;
  field: SortField;
  dir: SortDir;
}[] = [
  { value: 'name-asc', label: 'Name (A–Z)', field: 'name', dir: 'asc' },
  { value: 'name-desc', label: 'Name (Z–A)', field: 'name', dir: 'desc' },
  { value: 'mip-asc', label: 'MIP (shortest first)', field: 'mip', dir: 'asc' },
  { value: 'mip-desc', label: 'MIP (longest first)', field: 'mip', dir: 'desc' },
];

export function PoliciesPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = usePolicies();
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState(ALL_PROVIDERS);
  const [sort, setSort] = useState(SORT_OPTIONS[0].value);

  // Provider dropdown options, derived client-side from the fetched data.
  const providerNames = useMemo(() => (data ? deriveProviderOptions(data) : []), [data]);

  // Filter (search + provider) then sort — all client-side over the full list.
  const visibleRows = useMemo(() => {
    if (!data) return [];
    const selected = SORT_OPTIONS.find((o) => o.value === sort) ?? SORT_OPTIONS[0];
    return selectVisibleRows(data, {
      search,
      providerFilter,
      sort: { field: selected.field, dir: selected.dir },
    });
  }, [data, search, providerFilter, sort]);

  const onRowClick = (id: number) => navigate(`/policies/${id}`);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-50 flex-1 text-sm">
          <span className="mb-1 block font-medium text-gray-700">Search</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Policy name or variant…"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-gray-400 focus:outline-none"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Insurer</span>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 focus:border-gray-400 focus:outline-none"
          >
            <option value={ALL_PROVIDERS}>All insurers</option>
            {providerNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 focus:border-gray-400 focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading policies…</p>}

      {isError && (
        <p className="text-sm text-red-600">
          Couldn’t load policies. Check the backend is running and try again.
        </p>
      )}

      {!isLoading && !isError && (
        <>
          <p className="text-sm text-gray-500">
            {visibleRows.length} {visibleRows.length === 1 ? 'policy' : 'policies'}
          </p>
          {visibleRows.length === 0 ? (
            <p className="text-sm text-gray-500">No policies match your filters.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <PoliciesTable policies={visibleRows} onRowClick={onRowClick} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
