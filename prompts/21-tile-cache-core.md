---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/TileCache.ts scripts/tilecache-test.mjs package.json
read: src/game/Terrain.ts
ctx: 32k
title: TTC 21: Persistent LRU tile cache in IndexedDB (ION LRT pattern)
---
# TTC 21 · Persistent LRU tile cache in IndexedDB (ION LRT pattern)

Depends on: none. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/TileCache.ts scripts/tilecache-test.mjs package.json`.

## Current behaviour
Hi-res imagery is loaded from local baked JPEGs in `public/imagery/`, which covers only tiles within 250 m of the track. There is no browser cache.

## Target
A cache module like ION LRT's `src/game/map/MapCache.ts` (read-only reference): IndexedDB with `navigator.storage.persist()`, version-prefixed keys and LRU eviction. It has a memory backend so it can be tested in node.

## Steps
1. Create `src/game/TileCache.ts` with:
   - `CACHE_VERSION = 'ttc1'`;
   - `key(kind: 'oiwms', z, x, y) = \`${CACHE_VERSION}:${kind}:${z}/${x}/${y}\``;
   - `CAP_BYTES = 2 * 1024 ** 3` (ESTIMATE budget);
   - `interface Backend { get(k); put(k, blob, bytes); delete(k); all(): rows }`;
   - `createMemoryBackend()`;
   - `createIdbBackend()`, which resolves null when `indexedDB` is undefined;
   - `class TileCache { get(k): Promise<Blob|null>; put(k, blob): Promise<void>; stats() }`. It updates `lastUsed` on get, and evicts least-recently-used entries down to 95% of the cap when over it;
   - `askPersist()`, which calls `navigator.storage.persist()` when available and records the result.
2. Create `scripts/tilecache-test.mjs` (esbuild loader, memory backend). Asserts:
   - `versioned keys`;
   - `get refreshes LRU order`;
   - `eviction trims to 95% of cap, oldest first`;
   - `persist is optional (no navigator)`.
3. package.json: `test:tilecache` in the chain.

## Acceptance
- `npm test` passes, with the four cache tests PASS.

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
