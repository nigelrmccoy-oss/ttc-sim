---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Terrain.ts src/game/Scenery.ts
read: src/game/World.ts
ctx: 32k
title: TTC 94: Polish: terrain/scenery seams and LOD pop
---
# TTC 94 · Polish: terrain/scenery seams and LOD pop

Depends on: 22. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/Terrain.ts src/game/Scenery.ts`.

## Current behaviour
Terrain tiles are THREE.LOD at 0/1400 m. Hi-res imagery swaps at 1300/2000 m. Visible cracks between tile LODs and a pop when hi-res arrives.

## Target
No cracks: add skirts of 3 m down on every tile edge. Hi-res imagery fades in over 0.5 s (blend uniform or a material opacity crossfade). Scenery buckets use a hysteresis of ±100 m on visibility.

## Steps
1. Add skirts to both terrain LOD geometries.
2. When a hi-res texture loads, crossfade from low to high over 0.5 s.
3. Scenery: per-500 m bucket visibility with hysteresis (show < 1800 m, hide > 1900 m; ESTIMATE).

## Acceptance
- `npm test` passes, with `no console errors`.

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
