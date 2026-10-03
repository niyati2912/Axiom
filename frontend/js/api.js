const cache = new Map();
const TTL_MS = 30_000;

export const clearApiCache = () => cache.clear();

export async function api(path, { params, method = "GET", body, fresh = false } = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) if (v !== "" && v != null) qs.set(k, v);
  const query = qs.toString();
  const url = `/api${path}${query ? "?" + query : ""}`;

  if (method === "GET" && !fresh) {
    const hit = cache.get(url);
    if (hit && Date.now() - hit.t < TTL_MS) return hit.v;
  }

  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try { payload = await res.json(); } catch { /* non-JSON error body */ }

  if (!res.ok) {
    const d = payload?.detail;
    throw new Error(typeof d === "string" ? d
      : Array.isArray(d) ? d.map((e) => e.msg).join("; ")
      : `Request failed (${res.status})`);
  }
  if (method === "GET") cache.set(url, { t: Date.now(), v: payload });
  return payload;
}