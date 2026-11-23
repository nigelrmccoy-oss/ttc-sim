---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Train.ts scripts/smoke-test.mjs
read: src/game/Game.ts src/main.ts
ctx: 32k
title: TTC 24: Verify the TR GLB cars in game (already wired, box fallback)
---
# TTC 24 · Verify the TR GLB cars in game (already wired, box fallback)

Depends on: 23. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/Train.ts scripts/smoke-test.mjs`.

## Current behaviour
Done by the TTC Sim bot on 2026-11-22: `Train.ts` exports `loadTrModels()` (GLTFLoader) and `Train.setModels()`. That puts the cab at both ends (the rear one turned 180°) and middle cars between, with shadows on. `main.ts` loads the models after `game.start()` and keeps the boxes if the files are missing. `debug.trainModel` is `glb` or `boxes`, and the smoke test asserts `glb` when `public/models/tr_cab.glb` exists.

## Target
A verification pass with small fixes only: the box geometry replaced by `setModels` is disposed, and the materials too.

## Steps
1. In `Train.setModels`, also dispose the replaced box materials (`(c as THREE.Mesh).material`, single or array). Do not touch the GLB clones (their geometry is shared).
2. In `scripts/smoke-test.mjs`, keep the `train model reported` assert. Print `info train model <glb|boxes>`.

## Acceptance
- `npm test` passes with `train model reported` PASS (`glb`).

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
