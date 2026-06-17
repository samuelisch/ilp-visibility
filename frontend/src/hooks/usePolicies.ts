import { useQuery } from '@tanstack/react-query';
import { fetchPolicies } from '../api/policies';

// Stable key: the full list is fetched once and filtered client-side (204 rows),
// so the query key never varies with search/provider/sort.
export function usePolicies() {
  return useQuery({
    queryKey: ['policies'],
    queryFn: fetchPolicies,
  });
}
