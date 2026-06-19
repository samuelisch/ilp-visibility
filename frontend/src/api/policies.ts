import { useQuery } from '@tanstack/react-query';
import type { PolicyListItem, PolicyDetail } from '../types/policy';
import { getJson } from './fetch';

export function fetchPolicies(): Promise<PolicyListItem[]> {
  return getJson<PolicyListItem[]>('/api/policies');
}
export function fetchPolicyDetail(id: number): Promise<PolicyDetail> {
  return getJson<PolicyDetail>(`/api/policies/${id}`);
}

export function usePolicies() {
  return useQuery({ queryKey: ['policies'], queryFn: fetchPolicies });
}
export function usePolicyDetail(id: number) {
  return useQuery({ queryKey: ['policy', id], queryFn: () => fetchPolicyDetail(id) });
}
