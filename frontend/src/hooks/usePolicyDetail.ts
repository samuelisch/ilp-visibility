import { useQuery } from '@tanstack/react-query';
import { fetchPolicyDetail } from '../api/policies';

export function usePolicyDetail(id: number) {
  return useQuery({
    queryKey: ['policy', id],
    queryFn: () => fetchPolicyDetail(id),
  });
}
