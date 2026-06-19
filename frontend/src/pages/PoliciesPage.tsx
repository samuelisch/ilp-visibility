import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { usePolicies } from '../api/policies';
import { PolicyCard } from '../components/PolicyCard';
import { Field, inputClass } from '../components/ui/Field';
import { SegmentedControl } from '../components/ui/SegmentedControl';
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
  { value: 'name-asc', label: 'A–Z', field: 'name', dir: 'asc' },
  { value: 'name-desc', label: 'Z–A', field: 'name', dir: 'desc' },
  { value: 'mip-asc', label: 'MIP ↑', field: 'mip', dir: 'asc' },
  { value: 'mip-desc', label: 'MIP ↓', field: 'mip', dir: 'desc' },
];

export function PoliciesPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
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
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl text-ink">Every plan, every fee — in plain sight.</h2>
        <p className="mt-1 text-muted">
          Browse Singapore’s investment-linked policies and see what they really cost over time.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Search" className="min-w-50 flex-1">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Policy name or variant…"
            className={inputClass}
          />
        </Field>

        <Field label="Insurer" className="w-full sm:w-56">
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className={inputClass}
          >
            <option value={ALL_PROVIDERS}>All insurers</option>
            {providerNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Field>

        <div className="text-sm">
          <span className="mb-1 block font-medium text-muted">Sort by</span>
          <SegmentedControl options={SORT_OPTIONS} value={sort} onChange={setSort} />
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted">Loading policies…</p>}

      {isError && (
        <p className="text-sm text-accent">
          Couldn’t load policies. Check the backend is running and try again.
        </p>
      )}

      {!isLoading && !isError && (
        <>
          <p className="text-sm text-muted">
            {visibleRows.length} {visibleRows.length === 1 ? 'policy' : 'policies'}
          </p>
          {visibleRows.length === 0 ? (
            <p className="text-sm text-muted">No policies match your filters.</p>
          ) : (
            <div role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleRows.map((p, i) => (
                <motion.div
                  role="listitem"
                  key={p.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: reduceMotion ? 0 : Math.min(i, 12) * 0.03 }}
                >
                  <PolicyCard policy={p} onClick={onRowClick} />
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
