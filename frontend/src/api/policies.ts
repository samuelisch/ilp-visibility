import type { PolicyListItem, PolicyDetail } from '../types/policy';

// Relative paths go through the Vite dev proxy to the NestJS server (DECISION 035).
async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status} ${res.statusText}): ${url}`);
  }
  return res.json() as Promise<T>;
}

export function fetchPolicies(): Promise<PolicyListItem[]> {
  return getJson<PolicyListItem[]>('/api/policies');
}

export function fetchPolicyDetail(id: number): Promise<PolicyDetail> {
  return getJson<PolicyDetail>(`/api/policies/${id}`);
}
