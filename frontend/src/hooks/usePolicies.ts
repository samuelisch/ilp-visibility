import { useQuery } from '@tanstack/react-query';
import { fetchPolicies } from '../api/policies';

export function usePolicies() {
  return useQuery({
    queryKey: ['policies'],
    queryFn: fetchPolicies,
  });
}
