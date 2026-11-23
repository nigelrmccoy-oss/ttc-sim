---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: scripts/blender/tr_car.py public/models/README.md
read: src/game/Train.ts package.json
ctx: 32k
title: TTC 23: Verify and tidy the TR-style Blender script and GLBs (already built)
---
# TTC 23 · Verify and tidy the TR-style Blender script and GLBs (already built)

Depends on: none. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `scripts/blender/tr_car.py public/models/README.md`.

## Current behaviour
Done by the TTC Sim bot on 2026-11-22: `scripts/blender/tr_car.py` builds `public/models/tr_cab.glb` (1 782 tris, 97 KB) and `tr_mid.glb` (1 548 tris, 82 KB) in Blender 4.3.2. The GLBs and the preview `docs/images/tr-preview.png` are committed, and `npm run check:py` (first in `test`) compiles the script.
Dimensions are ESTIMATE constants at the top of the script. The front is glTF +Z (Blender −Y), matching `Train.ts` `car.lookAt(front)`, and the origin is at rail level at the car centre.

## Target
A tidy-only pass: the script and README agree, every dimension constant carries `ESTIMATE` or a documented basis, and there are no trademark elements. No geometry change is needed.

## Steps
1. Read `scripts/blender/tr_car.py`. Make sure every dimension constant has an `# ESTIMATE` comment or a documented basis (gauge 1495 mm is documented). Fix only comments or docstrings, and do not change any numbers.
2. Make sure `public/models/README.md` lists the same values as the script constants and states "original non-trademark tribute". Fix any mismatch in the README.
3. Do not add text, logos or numbers to the model. Do not edit package.json (`check:py` already exists).

## Acceptance
- `npm test` passes (`check:py` compiles the script).
- `git diff` touches only comments, docstrings or the README.

## Test
`flock /tmp/nigian-heavy-tests.lock npm test`, run from `/home/nig/ttc-sim`. The queue runs it as the gate. Print nothing secret.

## Manual follow-up (not for Devstral)
Only if geometry changes later: `flock /tmp/nigian-heavy-tests.lock blender -b --factory-startup -P scripts/blender/tr_car.py -- --out public/models --preview docs/images/tr-preview.png`, then commit the GLBs (< 1.5 MB each).

## Rules
- Edit **only** the files in `files:`. Any other edit fails the step. `read:` files are context only.
- You cannot run shell commands. The queue runs the gate itself: `npx tsc --noEmit`, then `flock /tmp/nigian-heavy-tests.lock npm test`, then the Code Checker.
  `npm test` = `test:data` (re-bakes `public/data/line1_profile.json` from `scripts/bake-profile.mjs`; it is generated and git-ignored) → `test:physics` → `build` → `test:smoke` (headless). Nigel's manual run is `flock /tmp/nigian-heavy-tests.lock npm test` from `/home/nig/ttc-sim`.
- **Never commit keys**: no API keys, tokens or passwords in code, data, comments or logs. Nothing here needs one.
- **No TTC logos, wordmarks, roundels or trademarks, and no copied sounds or images.** Original synthesis and generic designs only.
- **Label estimates**: any number not taken from a cited source carries `ESTIMATE` in a comment or a `basis` field. Never invent a citation.
- Headless only; never open a window on Nigel's screen. Keep `window.__ttcSim` (with `.debug`) and `window.__ttcSimTeleport(s)` working, because the smoke test uses them.
- Chainage `s` is metres from Vaughan Metropolitan Centre (s = 0) to Finch (about 38 721 m).
