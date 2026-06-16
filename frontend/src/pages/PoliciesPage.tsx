import { useMemo, useState } from 'react'
import { usePolicies } from '../hooks/usePolicies'
import { fetchPolicyDetail } from '../api/policies'
import { PoliciesTable } from '../components/PoliciesTable'

type SortField = 'name' | 'mip'
type SortDir = 'asc' | 'desc'

const SORT_OPTIONS: {
  value: string
  label: string
  field: SortField
  dir: SortDir
}[] = [
  { value: 'name-asc', label: 'Name (A–Z)', field: 'name', dir: 'asc' },
  { value: 'name-desc', label: 'Name (Z–A)', field: 'name', dir: 'desc' },
  { value: 'mip-asc', label: 'MIP (shortest first)', field: 'mip', dir: 'asc' },
  { value: 'mip-desc', label: 'MIP (longest first)', field: 'mip', dir: 'desc' },
]

const ALL_PROVIDERS = 'all'

export function PoliciesPage() {
  const { data, isLoading, isError } = usePolicies()
  const [search, setSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState(ALL_PROVIDERS)
  const [sort, setSort] = useState(SORT_OPTIONS[0].value)

  // Provider dropdown options, derived client-side from the fetched data.
  const providerNames = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.map((p) => p.provider.name))).sort((a, b) =>
      a.localeCompare(b),
    )
  }, [data])

  // Filter (search + provider) then sort — all client-side over the full list.
  const visibleRows = useMemo(() => {
    if (!data) return []
    const selected =
      SORT_OPTIONS.find((o) => o.value === sort) ?? SORT_OPTIONS[0]
    const q = search.trim().toLowerCase()

    const filtered = data.filter((p) => {
      const matchesSearch =
        q === '' ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      const matchesProvider =
        providerFilter === ALL_PROVIDERS || p.provider.name === providerFilter
      return matchesSearch && matchesProvider
    })

    return [...filtered].sort((a, b) => {
      if (selected.field === 'name') {
        const cmp = a.name.localeCompare(b.name)
        return selected.dir === 'asc' ? cmp : -cmp
      }

      // MIP sort: single-premium rows (null) always sort last, regardless of
      // direction; ties fall back to name for a stable, readable order.
      const aMip = a.paymentTermYears
      const bMip = b.paymentTermYears
      if (aMip === null && bMip === null) return a.name.localeCompare(b.name)
      if (aMip === null) return 1
      if (bMip === null) return -1
      if (aMip !== bMip) {
        const cmp = aMip - bMip
        return selected.dir === 'asc' ? cmp : -cmp
      }
      return a.name.localeCompare(b.name)
    })
  }, [data, search, providerFilter, sort])

  const onRowClick = async (id: number) => {
    try {
      const detail = await fetchPolicyDetail(id)
      console.log('policy detail', id, detail)
    } catch (err) {
      console.error('failed to fetch policy detail', id, err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-50 text-sm">
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
            <p className="text-sm text-gray-500">
              No policies match your filters.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <PoliciesTable policies={visibleRows} onRowClick={onRowClick} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
