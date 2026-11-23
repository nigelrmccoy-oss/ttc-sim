---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: scripts/blender/tr_car.py public/models/README.md package.json
read: src/game/Train.ts
ctx: 32k
title: TTC 23: Blender script for an original TR-style car model
---
# TTC 23 · Blender script for an original TR-style car model

Depends on: none. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `scripts/blender/tr_car.py public/models/README.md package.json`.

## Current behaviour
The cars are boxes in `Train.ts`.

## Target
A Python script that builds low-poly cab and middle cars in Blender. Running Blender is a manual step after this prompt.

## Steps
1. Write `scripts/blender/tr_car.py`. It runs with `blender -b --factory-startup -P scripts/blender/tr_car.py -- --out public/models` and writes `tr_cab.glb` and `tr_mid.glb`.
   - Dimensions, all ESTIMATE (public approximate figures; verify later): length over couplers 23.2 m, body width 3.13 m, roof 3.65 m above rail, 4 door pairs per side (1.3 m wide), bogie centres 16.1 m, wheel diameter 0.71 m.
   - Under 15k triangles per car, origin at rail level at the car centre, −Z forward, exported with `export_yup=True`.
   - Principled BSDF only: stainless (metallic 0.9, roughness 0.35), a generic red band, dark glass, black rubber. No logos or text; the destination sign stays blank.
   - Print `tris=<n> bbox=<x,y,z>`.
2. Create `public/models/README.md` with the dimensions, the basis for each, how to rebuild, and "original non-trademark tribute".
3. package.json: add `"check:py": "python3 -m py_compile scripts/blender/tr_car.py"` and put it first in `test`.

## Acceptance
- `npm test` passes; `check:py` compiles the script.

## Test
`flock /tmp/nigian-heavy-tests.lock npm test`, run from `/home/nig/ttc-sim`. The queue runs it as the gate. Print nothing secret.

## Manual follow-up (not for Devstral)
After merge: `flock /tmp/nigian-heavy-tests.lock blender -b --factory-startup -P scripts/blender/tr_car.py -- --out public/models`, then commit the two GLBs (< 1.5 MB each).

## Rules
- Edit **only** the files in `files:`. Any other edit fails the step. `read:` files are context only.
- You cannot run shell commands. The queue runs the gate itself: `npx tsc --noEmit`, then `flock /tmp/nigian-heavy-tests.lock npm test`, then the Code Checker.
  `npm test` = `test:data` (re-bakes `public/data/line1_profile.json` from `scripts/bake-profile.mjs`; it is generated and git-ignored) → `test:physics` → `build` → `test:smoke` (headless). Nigel's manual run is `flock /tmp/nigian-heavy-tests.lock npm test` from `/home/nig/ttc-sim`.
- **Never commit keys**: no API keys, tokens or passwords in code, data, comments or logs. Nothing here needs one.
- **No TTC logos, wordmarks, roundels or trademarks, and no copied sounds or images.** Original synthesis and generic designs only.
- **Label estimates**: any number not taken from a cited source carries `ESTIMATE` in a comment or a `basis` field. Never invent a citation.
- Headless only; never open a window on Nigel's screen. Keep `window.__ttcSim` (with `.debug`) and `window.__ttcSimTeleport(s)` working, because the smoke test uses them.
- Chainage `s` is metres from Vaughan Metropolitan Centre (s = 0) to Finch (about 38 721 m).
