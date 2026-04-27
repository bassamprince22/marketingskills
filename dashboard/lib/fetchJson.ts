/**
 * Safe fetch wrapper — throws a real Error instead of crashing with
 * "Unexpected token '<'" when an API returns HTML (redirect/error page).
 */
export async function fetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, init)
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const text = await res.text()
      const json = JSON.parse(text)
      if (json?.error) msg = json.error
    } catch {}
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}
