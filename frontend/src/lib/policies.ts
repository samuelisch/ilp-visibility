import type { PolicyListItem } from '../types/policy';

export type SortField = 'name' | 'mip';
export type SortDir = 'asc' | 'desc';

export const ALL_PROVIDERS = 'all';

export interface VisibleRowsOptions {
  search: string;
  providerFilter: string; // a provider name, or ALL_PROVIDERS
  sort: { field: SortField; dir: SortDir };
}

// Deduped, sorted list of provider names for the filter dropdown.
export function deriveProviderOptions(rows: PolicyListItem[]): string[] {
  return Array.from(new Set(rows.map((p) => p.provider.name))).sort((a, b) => a.localeCompare(b));
}

// Filter (search + provider) then sort — all client-side over the full list.
export function selectVisibleRows(
  rows: PolicyListItem[],
  { search, providerFilter, sort }: VisibleRowsOptions,
): PolicyListItem[] {
  const q = search.trim().toLowerCase();

  const filtered = rows.filter((p) => {
    const matchesSearch =
      q === '' || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    const matchesProvider = providerFilter === ALL_PROVIDERS || p.provider.name === providerFilter;
    return matchesSearch && matchesProvider;
  });

  return [...filtered].sort((a, b) => {
    if (sort.field === 'name') {
      const cmp = a.name.localeCompare(b.name);
      return sort.dir === 'asc' ? cmp : -cmp;
    }

    // MIP sort: single-premium rows (null) always sort last, regardless of
    // direction; ties fall back to name for a stable, readable order.
    const aMip = a.paymentTermYears;
    const bMip = b.paymentTermYears;
    if (aMip === null && bMip === null) return a.name.localeCompare(b.name);
    if (aMip === null) return 1;
    if (bMip === null) return -1;
    if (aMip !== bMip) {
      const cmp = aMip - bMip;
      return sort.dir === 'asc' ? cmp : -cmp;
    }
    return a.name.localeCompare(b.name);
  });
}
