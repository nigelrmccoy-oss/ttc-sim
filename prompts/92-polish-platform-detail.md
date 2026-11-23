---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/World.ts
read: src/game/Track.ts
ctx: 32k
title: TTC 92: Polish: platform detail (yellow edge strip, tactile edge, signs, lighting)
---
# TTC 92 · Polish: platform detail (yellow edge strip, tactile edge, signs, lighting)

Depends on: 90. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/World.ts`.

## Current behaviour
Platforms are flat slabs. Signs are 10×1.25 m, every 30 m. Station lighting is emissive only.

## Target
Generic, non-trademark platform details:
- a 0.6 m safety-yellow edge strip (#f2c200), plus a tactile dome band 0.6 m inboard (bumped normal or a fine grid texture);
- 0.3 m light fixtures every 6 m on the ceiling (emissive);
- station name signs kept;
- a "mind the gap" style text-free stripe on the edge face.

## Steps
1. In the platform builder, add the strip and tactile band as merged geometry per platform (one draw call each).
2. Add emissive ceiling fixtures as one InstancedMesh per station.
3. Add `platformDetail: true` to WorldStats.

## Acceptance
- `npm test` passes. The draw calls in the smoke `views` lines rise by less than 15 per station view.

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
