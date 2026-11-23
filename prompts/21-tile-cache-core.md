---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/TileCache.ts scripts/tilecache-test.mjs package.json
read: src/game/Terrain.ts scripts/lib-overpass.mjs
ctx: 32k
title: TTC 21: Persistent map tile cache: shared sim rule set (IndexedDB, 16 GB LRU)
---
# TTC 21 · Persistent map tile cache: shared sim rule set (IndexedDB, 16 GB LRU)

Depends on: none. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/TileCache.ts scripts/tilecache-test.mjs package.json`.

## Current behaviour
Hi-res imagery comes only from local baked JPEGs in `public/imagery/` (tiles within 250 m of the track). There is no browser cache.
OSM is bake-time only: `scripts/lib-overpass.mjs` asks nigian's Overpass at `http://127.0.0.1:12346/api/interpreter` first, then public mirrors, and stops after 3 missed requests. The game makes no Overpass calls.

## Target
`src/game/TileCache.ts` implements the shared sim map-cache rule set. The pattern is nig-drives `src/game/map/OverpassCache.ts` (read only, never edit nig-drives; its key points are copied here):
- IndexedDB store with `navigator.storage.persist()`;
- 16 GB cap with LRU eviction (cap = min(16 GiB, 0.8 × `navigator.storage.estimate().quota`));
- version-prefixed keys, and the cache is read before the network;
- a network cooldown that stops after 3 missed tiles;
- `stats()` and `clear()` for a UI size readout and Clear button (prompt 22 adds the UI);
- fail soft: private mode, no IndexedDB or quota errors behave as a miss;
- Bing, Cesium and Google 3D Tiles are never disk-cached beyond their HTTP cache headers. `cacheable(url)` returns false for those hosts, so they always go to `fetch` with the browser's normal HTTP cache. OIWMS (Open Government Licence – Ontario) may be cached.

## Steps
1. Create `src/game/TileCache.ts` exporting:
   - `CACHE_VERSION = 'ttc1'` and `key(kind: 'oiwms', z, x, y)`, which returns `` `${CACHE_VERSION}:${kind}:${z}/${x}/${y}` ``;
   - `CAP_BYTES = 16 * 1024 ** 3` (shared rule) and `MISS_LIMIT = 3`;
   - `cacheable(url: string): boolean`, which is false when the host matches `/(virtualearth|bing)\.(net|com)|cesium\.com|tile\.googleapis\.com|googleapis\.com\/.*3dtiles/i`;
   - `interface Row { key: string; blob: Blob; bytes: number; lastUsed: number }`;
   - `interface Backend { get(k): Promise<Row|null>; put(r: Row): Promise<void>; delete(k): Promise<void>; all(): Promise<Row[]>; clear(): Promise<void> }`;
   - `createMemoryBackend()`;
   - `createIdbBackend(dbName = 'ttc-sim-tiles')`, an IndexedDB store keyed by `key` with a `lastUsed` index. It resolves null when `indexedDB` is undefined or open fails;
   - `askPersist(): Promise<boolean|null>`. It calls `navigator.storage.persisted()` and then `persist()` when available, and records the result in `storagePersisted`. It is null when `navigator` is absent;
   - `class TileCache { constructor(backend: Backend|null, capBytes = CAP_BYTES) }` with these methods:
     - `get(k)`: a hit updates `lastUsed`;
     - `put(k, blob)`: after a put, when the total is over the cap, delete the least-recently-used rows until the total is ≤ 95% of the cap;
     - `fetchTile(url, k, fetcher = fetch)`: cache first (when `cacheable(url)`), then the network when not cooling. A non-ok answer or a throw counts as a miss. After `MISS_LIMIT` consecutive misses, `cooling` is true and the network is skipped for 10 minutes (`COOLDOWN_MS = 600_000`). A success resets the miss count. It returns `Blob|null` and never throws;
     - `stats(): Promise<{ count, bytes, persisted, cooling }>`;
     - `clear(): Promise<void>`.
   A null backend acts as an always-miss cache.
2. Create `scripts/tilecache-test.mjs` (esbuild loader as in `scripts/physics-test.mjs`, memory backend, fake fetcher, injectable clock). It asserts:
   - `versioned keys` (the key starts with `ttc1:`);
   - `cache read before network` (a second fetchTile for the same key makes no fetcher call);
   - `get refreshes LRU order`;
   - `eviction trims to 95% of cap, oldest first` (use a small cap such as 1000 bytes);
   - `cooldown after 3 missed tiles` (the 4th call makes no fetcher call; after the clock passes `COOLDOWN_MS` it tries again);
   - `success resets miss count`;
   - `Bing/Cesium/Google 3D Tiles not disk-cached` (after fetchTile, a `virtualearth.net` URL leaves the store empty);
   - `clear empties stats`;
   - `persist is optional (no navigator)`.
3. package.json: add `"test:tilecache": "node scripts/tilecache-test.mjs"` and put it in `test` after `test:physics`.

## Acceptance
- `npm test` passes, with all nine cache tests PASS.
- The `TileCache.ts` header comment names nig-drives `OverpassCache.ts` as the pattern and lists the rule set.

## Test
`flock /tmp/nigian-heavy-tests.lock npm test`, run from `/home/nig/ttc-sim`. The queue runs it as the gate. Print nothing secret.

## Rules
- Edit **only** the files in `files:`. Any other edit fails the step. `read:` files are context only.
- You cannot run shell commands. The queue runs the gate itself: `npx tsc --noEmit`, then `flock /tmp/nigian-heavy-tests.lock npm test`, then the Code Checker.
  `npm test` = `test:data` (re-bakes `public/data/line1_profile.json` from `scripts/bake-profile.mjs`; it is generated and git-ignored) → `test:physics` → `build` → `test:smoke` (headless). Nigel's manual run is `flock /tmp/nigian-heavy-tests.lock npm test` from `/home/nig/ttc-sim`.
- **Never commit keys**: no API keys, tokens or passwords in code, data, comments or logs. Nothing here needs one.
- **No TTC logos, wordmarks, roundels or trademarks, and no copied sounds or images.** Original synthesis and generic designs only.
- **Label estimates**: any number not taken from a cited source carries `ESTIMATE` in a comment or a `basis` field. Never invent a citation.
- Headless only; never open a window on Nigel's screen. Keep `window.__ttcSim` (with `.debug`) and `window.__ttcSimTeleport(s)` working, because the smoke test uses them.
- Chainage `s` is metres from Vaughan Metropolitan Centre (s = 0) to Finch (about 38 721 m).
