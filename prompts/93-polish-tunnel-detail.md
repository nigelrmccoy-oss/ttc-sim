---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/World.ts
read: src/game/Track.ts
ctx: 32k
title: TTC 93: Polish: tunnel detail (lighting, cable trays, signals)
---
# TTC 93 · Polish: tunnel detail (lighting, cable trays, signals)

Depends on: 92. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/World.ts`.

## Current behaviour
Tunnel lamps every 25 m. Box and bore walls are plain.

## Target
Box and bore sections get:
- a cable tray (0.4×0.1 m, two levels, wall side away from the walkway);
- a raised walkway edge;
- generic wayside signal heads (dark housing, red/green lens, emissive) every 400 m on the right, ESTIMATE spacing, purely visual;
- all as InstancedMesh or merged per 500 m chunk.

## Steps
1. Add tray, walkway lip and signal geometry to the per-chunk builders.
2. Signals show green unless the ATC (prompt 16) target ahead is lower, but keep World independent: just expose `setSignalAspect(i, 'g' | 'r')` and default to green.
3. Add `signals: n` to WorldStats.

## Acceptance
- `npm test` passes. `world.signals > 50`, and draw calls stay within +10%.

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
