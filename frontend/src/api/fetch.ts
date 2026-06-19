// Generic HTTP helpers shared by every api/<resource>.ts. Add postJson/putJson/etc. here
// as needed — one place for request/error conventions.
export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status} ${res.statusText}): ${url}`);
  }
  return res.json() as Promise<T>;
}
