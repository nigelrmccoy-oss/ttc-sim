---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Terrain.ts
read: src/game/TileCache.ts
ctx: 32k
title: TTC 22: Load uncached OIWMS hi-res tiles live through the tile cache
---
# TTC 22 · Load uncached OIWMS hi-res tiles live through the tile cache

Depends on: 21. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/Terrain.ts`.

## Current behaviour
`Terrain.updateImagery(cameraPos)` loads hi-res textures only for tiles in the baked index; other tiles stay low-res.

## Target
For tiles with no baked hi-res image, fetch the 4×4 z17 OIWMS tiles live:
`https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_Imagery/Ontario_Imagery_Web_Map_Service/MapServer/tile/{z}/{y}/{x}` (no key, Open Government Licence – Ontario).
Store them in the TileCache, stitch them on a 1024 px canvas, and keep the existing LOD rules (load within 1300 m, drop beyond 2000 m).

## Steps
1. In Terrain.ts, add `private cache = new TileCache(...)`. Call `askPersist()` once.
2. In the hi-res path, when the baked index has no hi-res entry, run `loadLive(z15 tile)`:
   - for each of the 16 z17 tiles: cache.get → else `fetch` (max 4 in flight; skip on error) → cache.put;
   - draw to the canvas and make a CanvasTexture.
3. If the cache or `fetch` is unavailable, quietly keep the low-res texture.
4. Keep the attribution string unchanged. It already credits OIWMS.

## Acceptance
- `npm test` passes. Smoke runs offline, so live fetches fail quietly with `no console errors`; any fetch error must be caught and must not use console.error.

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
