const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status} ${res.statusText}): ${API_BASE}${url}`);
  }
  return res.json() as Promise<T>;
}
