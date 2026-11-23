/**
 * Overpass client for the bake scripts (shared sim map-cache rule set; pattern:
 * nig-drives src/game/map/OverpassClient.ts + OverpassCache.ts, read only).
 *
 * - nigian's local Ontario Overpass (127.0.0.1:12346) first, public mirrors as fallback.
 *   OVERPASS_URL overrides the local default; OVERPASS_URL=public skips it.
 * - Cooldown: a failed mirror is skipped for the rest of the run (loopback: after one
 *   short failure). After 3 missed requests in a row the client stops asking the network
 *   (throws) so a bake falls back to its committed raw cache instead of hammering mirrors.
 * - The bake scripts read their committed raw cache (scripts/raw/*.json) before the network;
 *   they only call this with REFETCH=1 or when the raw file is missing.
 * Data: © OpenStreetMap contributors, ODbL 1.0 (see README / in-game attribution).
 */
export const LOCAL_OVERPASS = 'http://127.0.0.1:12346/api/interpreter';
export const PUBLIC_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
export const MAX_MISSES = 3;
export const ATTRIBUTION = '© OpenStreetMap contributors, ODbL 1.0';

export function mirrors(env = process.env) {
  const v = (env.OVERPASS_URL ?? '').trim();
  if (/^public$/i.test(v)) return [...PUBLIC_MIRRORS];
  return [/^https?:\/\//.test(v) ? v : LOCAL_OVERPASS, ...PUBLIC_MIRRORS];
}

const isLoopback = (u) => /^https?:\/\/(127\.0\.0\.1|\[::1\]|localhost)[:/]/i.test(u);
const cooling = new Set();
let misses = 0;

/** POST an Overpass QL query; returns { json, via }. Throws after MAX_MISSES consecutive misses. */
export async function overpass(query, { timeoutMs = 200_000, log = console.error } = {}) {
  for (const url of mirrors()) {
    if (cooling.has(url)) continue;
    if (misses >= MAX_MISSES) break;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'User-Agent': 'ttc-sim-bake/0.3 (personal project)', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(isLoopback(url) ? Math.min(timeoutMs, 120_000) : timeoutMs),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const json = JSON.parse(text);
      if (json.remark && /runtime error|timed out/i.test(json.remark)) throw new Error(json.remark.slice(0, 120));
      misses = 0;
      return { json, text, via: url };
    } catch (e) {
      misses++;
      cooling.add(url);
      log(`overpass: ${new URL(url).host} missed (${e.message}); misses ${misses}/${MAX_MISSES}`);
    }
  }
  throw new Error(`overpass: stopped after ${misses} missed requests; using cached raw data is the fallback`);
}
