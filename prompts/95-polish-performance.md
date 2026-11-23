---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/World.ts src/game/Scenery.ts scripts/smoke-test.mjs
read: src/game/Game.ts
ctx: 32k
title: TTC 95: Polish: performance pass (draw calls, frame time on the RX 580)
---
# TTC 95 · Polish: performance pass (draw calls, frame time on the RX 580)

Depends on: 92, 93, 94. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/World.ts src/game/Scenery.ts scripts/smoke-test.mjs`.

## Current behaviour
Measured at 0.2.0 (`SMOKE_GPU=1`, RX 580 headless): 60 fps (vsync), 69–574 draw calls, 0.1–1.16 M triangles.

## Target
Worst-view draw calls ≤ 400 and triangles ≤ 1.2 M with all polish in. The smoke test records frame-time percentiles.

## Steps
1. Merge static per-chunk meshes that share a material: tunnel lamps, trays, platform details.
2. Set `frustumCulled` correctly, and avoid per-frame allocations in `Game.frame`.
3. `smoke-test.mjs`: in the views loop, sample 120 frames with `requestAnimationFrame` timestamps and log `p50/p95 ms`.
   Add `assert('draw calls within budget at every view', maxCalls <= 400)`.

## Acceptance
- `npm test` passes, including the new budget assert. Nigel can also run `SMOKE_GPU=1 flock /tmp/nigian-heavy-tests.lock npm run test:smoke` for the RX 580 numbers.

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
