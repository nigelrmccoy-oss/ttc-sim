---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Train.ts src/main.ts scripts/smoke-test.mjs
read: src/game/Game.ts
ctx: 32k
title: TTC 24: Use the TR GLB models with a box fallback
---
# TTC 24 · Use the TR GLB models with a box fallback

Depends on: 23. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/Train.ts src/main.ts scripts/smoke-test.mjs`.

## Current behaviour
`Train` builds box cars. `Train.place(track, s)` positions them with `car.lookAt(front)`.

## Target
If `public/models/tr_cab.glb` and `tr_mid.glb` load, the GLB cars are used: cab at both ends with the rear one rotated 180°, middle cars between. Otherwise the boxes are used. `debug.trainModel` is `glb` or `boxes`.

## Steps
1. `main.ts`: preload both files with `GLTFLoader` (`three/examples/jsm/loaders/GLTFLoader.js`). Catch a missing file and leave the templates null.
2. `Train.ts`: add an optional `templates` constructor argument. Clone per car and keep `castShadow`. Keep the headlight anchor and consist length.
3. `smoke-test.mjs`: add `assert('train model reported', ['glb','boxes'].includes(final.trainModel))`.

## Acceptance
- `npm test` passes whether or not the GLBs exist. (The new assert accepts both, so it passes before the manual Blender step.)

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
