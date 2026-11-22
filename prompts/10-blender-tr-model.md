---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: scripts/blender/tr_car.py public/models/README.md
read: src/game/Train.ts
ctx: 32k
title: TTC 10: Blender script for a 6-car TR-style train model
---
# 10 · Blender script for a 6-car TR-style train model

Depends on: none. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`.

## Context
The cars in `src/game/Train.ts` are boxes (`BODY_W`, `ROOF_Y`, `FLOOR_Y`, the `LIVERY` colours). We want a proper low-poly model of a TR-style car, built **by a Python script** so it can be rebuilt. Blender is `/usr/bin/blender`; run it headless.

## Task
Write `scripts/blender/tr_car.py`. Run it with:
`blender -b --factory-startup -P scripts/blender/tr_car.py -- --out public/models`
It writes `tr_cab.glb` (a car with a cab) and `tr_mid.glb` (a middle car).

- **Dimensions.** These are public approximate figures; label them ESTIMATE in the script and verify them later.
  - Car length over couplers 23.2 m, body width 3.13 m, roof 3.65 m above the rail.
  - Four door pairs per side, about 1.3 m wide.
  - Bogie centres 16.1 m apart, wheel diameter 0.71 m.
- **Geometry.** Rounded roof edges with a bevel, plus window and door insets and two bogies with wheels.
  - The cab end has a sloped windscreen, two headlight clusters and two red marker lights, a destination-sign recess with **no text and no logo**, and an inter-car gangway on the inner end.
  - Origin at rail level at the car's centre. +Y up and −Z forward (three.js style), so export with `export_yup=True`.
  - Under 15k triangles per car.
- **Materials.** Principled BSDF only:
  - stainless body (metallic 0.9, roughness 0.35);
  - a red accent band (generic; no TTC wordmark);
  - dark glass and black rubber.
  - No image textures, so the GLB stays self-contained and small.
- In `public/models/README.md`, record the dimensions, their basis, how to rebuild, and that the model is an original, non-trademark tribute.

## Acceptance
- Both GLBs exist, each under 1.5 MB.
- The script prints the triangle count and bounding box, and the bounding box matches the dimensions to within 5 cm.

## Test
`flock /tmp/nigian-heavy-tests.lock blender -b --factory-startup -P scripts/blender/tr_car.py -- --out public/models > logs/blender.log 2>&1; grep -E 'tris|bbox|Error' logs/blender.log | tail -n 20`
`ls -l public/models/*.glb`

## Rules (every prompt)
- Edit only the files listed in `files:` above. Read the `read:` files for context; do not change them.
- Stack is Vite + TypeScript + Three.js. Keep `npx tsc --noEmit` clean.
- **Keys never get committed.** No API keys, tokens or passwords in code, data, logs or commit messages. None of these tasks need one.
- **Heavy runs go under the shared lock:** `flock /tmp/nigian-heavy-tests.lock <cmd>` for `npm test`, `npm run build`, bake scripts, Blender and anything that starts a browser.
- Headless only. Never open the game or a browser window on Nigel's screen. Kill any server you start.
- Trim output: send full logs to `logs/<name>.log` and look at them with `tail -n 40` or `grep`.
- Every number that is not from a cited source is labelled `ESTIMATE` in a comment or a `basis` field. No TTC logos, trademarks or copied sounds.
- Commit locally on the branch only. **Never push.** Nigel reviews first.
