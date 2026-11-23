---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Game.ts
read: src/game/Train.ts
ctx: 32k
title: TTC 91: Polish: cab view and lighting
---
# TTC 91 · Polish: cab view and lighting

Depends on: 90. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/Game.ts`.

## Current behaviour
The cab camera sits at the head of the train. The headlight is a SpotLight(0xfff2d8, 120, 260, 0.5, 0.8, 1.0) that fades out outdoors. Sun shadows cover ±110 m.

## Target
The cab eye height is 2.6 m above the rail (ESTIMATE; TR floor about 1.1 m plus a seated driver). A slight head-bob comes from vertical acceleration. Tunnel exposure adapts over 1.5 s. The headlight cone does not clip the platform edge.

## Steps
1. Put the cab eye at +2.6 m and 0.8 m behind the nose, offset 0.5 m to the left of centre (ESTIMATE).
2. Add an exposure lerp: `renderer.toneMappingExposure` goes toward 1.4 in tunnels and 1.0 outside, with a time constant of 1.5 s.
3. Head-bob: ±2 cm vertical, driven by `|dv/dt|` and speed; off when stopped.
4. Set the headlight target 60 m ahead at rail height.

## Acceptance
- `npm test` passes. The `views` screenshots in logs/ are not black: the smoke test's `frame is not blank` passes.

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
