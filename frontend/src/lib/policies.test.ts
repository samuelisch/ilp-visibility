import { describe, it, expect } from 'vitest';
import { selectVisibleRows, deriveProviderOptions, ALL_PROVIDERS } from './policies';
import type { PolicyListItem } from '../types/policy';

const rows: PolicyListItem[] = [
  {
    id: 1,
    name: 'Beta',
    description: 'single plan',
    domicile: 'sgd',
    paymentTermYears: null,
    sourceType: 'cash',
    provider: { name: 'AIA' },
  },
  {
    id: 2,
    name: 'Alpha',
    description: 'regular plan',
    domicile: 'sgd',
    paymentTermYears: 20,
    sourceType: 'cash',
    provider: { name: 'Manulife' },
  },
  {
    id: 3,
    name: 'Gamma',
    description: 'regular plan',
    domicile: 'usd',
    paymentTermYears: 10,
    sourceType: 'cash',
    provider: { name: 'AIA' },
  },
];

const base = {
  search: '',
  providerFilter: ALL_PROVIDERS,
  sort: { field: 'name' as const, dir: 'asc' as const },
};

describe('deriveProviderOptions', () => {
  it('dedupes and sorts provider names', () => {
    expect(deriveProviderOptions(rows)).toEqual(['AIA', 'Manulife']);
  });
});

describe('selectVisibleRows — filter', () => {
  it('search matches name, case-insensitive', () => {
    expect(selectVisibleRows(rows, { ...base, search: 'alph' }).map((r) => r.id)).toEqual([2]);
  });
  it('search matches description', () => {
    expect(
      selectVisibleRows(rows, { ...base, search: 'regular' })
        .map((r) => r.id)
        .sort(),
    ).toEqual([2, 3]);
  });
  it('provider filter restricts to one insurer', () => {
    expect(
      selectVisibleRows(rows, { ...base, providerFilter: 'AIA' })
        .map((r) => r.id)
        .sort(),
    ).toEqual([1, 3]);
  });
  it('ALL_PROVIDERS returns everything', () => {
    expect(selectVisibleRows(rows, base)).toHaveLength(3);
  });
  it('returns empty when nothing matches', () => {
    expect(selectVisibleRows(rows, { ...base, search: 'zzz' })).toHaveLength(0);
  });
});

describe('selectVisibleRows — sort', () => {
  it('name asc', () => {
    expect(
      selectVisibleRows(rows, { ...base, sort: { field: 'name', dir: 'asc' } }).map((r) => r.name),
    ).toEqual(['Alpha', 'Beta', 'Gamma']);
  });
  it('name desc', () => {
    expect(
      selectVisibleRows(rows, { ...base, sort: { field: 'name', dir: 'desc' } }).map((r) => r.name),
    ).toEqual(['Gamma', 'Beta', 'Alpha']);
  });
  it('mip asc — null (single premium) sorts last', () => {
    expect(
      selectVisibleRows(rows, { ...base, sort: { field: 'mip', dir: 'asc' } }).map((r) => r.id),
    ).toEqual([3, 2, 1]);
  });
  it('mip desc — null STILL sorts last', () => {
    expect(
      selectVisibleRows(rows, { ...base, sort: { field: 'mip', dir: 'desc' } }).map((r) => r.id),
    ).toEqual([2, 3, 1]);
  });
});
