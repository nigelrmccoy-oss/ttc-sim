---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: scripts/physics-test.mjs
read: scripts/bake-profile.mjs data/structure_depths.json
ctx: 32k
title: TTC 05: Tests for the corrected tunnel types
---
# TTC 05 · Tests for the corrected tunnel types

Depends on: 04. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `scripts/physics-test.mjs`.

## Current behaviour
After prompt 04 the profile has the new construction labels, but no test pins them.

## Target
Regression tests that fail if a future bake reverts the documented tunnel types.

## Steps
1. In `scripts/physics-test.mjs`, after the existing profile tests, read `profile.construction` at given chainages with `idx = Math.round(s / profile.stepM)`.
2. Add:
   - `assert('Casa Loma section is a tunnel bore', construction at 17800 starts with 'bored')`.
   - `assert('North Yonge between stations is bored', 31500 and 35300 both 'bored (North Yonge)')`.
   - `assert('Hogg’s Hollow and Sheppard-Finch are boxes', 34600 and 37800 both start with 'box')`.
   - `assert('Lawrence rail is about 18.3 m below ground', |ground - rail - 18.3| < 1.5 at the Lawrence chainage from line1.json)`.
   - `assert('North Yonge bore diameter documented', structure.northYongeBoreDiameter.value === 4.9 && status === 'documented')`.

## Acceptance
- All five new tests PASS, and the existing tests still PASS.

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
