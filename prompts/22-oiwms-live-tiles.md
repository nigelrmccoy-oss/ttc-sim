---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Terrain.ts src/game/CachePanel.ts src/main.ts
read: src/game/TileCache.ts src/game/Game.ts index.html
ctx: 32k
title: TTC 22: Live OIWMS tiles through the tile cache, plus a cache size readout and Clear button
---
# TTC 22 · Live OIWMS tiles through the tile cache, plus a cache size readout and Clear button

Depends on: 21. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/Terrain.ts src/game/CachePanel.ts src/main.ts`.

## Current behaviour
`Terrain.updateImagery(cameraPos)` loads hi-res textures only for tiles in the baked index; other tiles stay low-res. There is no cache UI.

## Target
Tiles with no baked hi-res image load live from OIWMS through `TileCache.fetchTile` (cache first, 16 GB LRU, cooldown after 3 missed tiles; see 21 and nig-drives `OverpassCache.ts`).
The URL is `https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_Imagery/Ontario_Imagery_Web_Map_Service/MapServer/tile/{z}/{y}/{x}` (no key, Open Government Licence – Ontario).
A small corner panel shows the cache size and has a Clear button.

## Steps
1. `Terrain.ts`:
   - add `private cache = new TileCache(null)` and an `async initCache()` that swaps in `createIdbBackend()` and calls `askPersist()`;
   - in `updateImagery`, when the baked index has no hi-res entry for a z15 tile within 1300 m, run `loadLive(tile)`. It fetches the 16 z17 tiles through `cache.fetchTile(url, key('oiwms', 17, x, y))` with at most 4 in flight, skips nulls, draws them on a 1024 px canvas and makes a `CanvasTexture` (sRGB). Keep the existing LOD rules (load within 1300 m, drop beyond 2000 m, dispose on drop);
   - while `cache.stats().cooling` is true, do not start new live loads;
   - any failure keeps the low-res texture quietly, with no console.error.
2. Create `src/game/CachePanel.ts` with `mountCachePanel(cache: TileCache, parent = document.body)`. It adds a small fixed bottom-left `div#cache-panel` (inline styles, about 11 px text, semi-transparent dark background, so no CSS file edit is needed) that shows `Map cache: <n> tiles · <MB> MB` (GB above 1024 MB), `· persistent` or `· may be cleared by browser`, and `· network paused (3 misses)` while cooling. It has a `button#cache-clear` labelled `Clear`, which runs `cache.clear()` and then refreshes. Refresh every 5 s and after each clear. Do not catch keyboard keys, so the driving controls keep working.
3. `Terrain` exposes `readonly cache`. `main.ts` calls `await game.terrain?.initCache()` (when terrain exists) and `mountCachePanel(game.terrain.cache)` after `game.start()`. Leave `window.__ttcSim` and `__ttcSimTeleport` unchanged.
4. Keep the attribution unchanged. It already credits OIWMS (OGL-Ontario) and OSM (ODbL).

## Acceptance
- `npm test` passes. The smoke test runs offline, so live fetches miss; after 3 misses the cooldown stops further requests, and `no console errors` still passes.
- `#cache-panel` and `#cache-clear` exist in the page.

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
