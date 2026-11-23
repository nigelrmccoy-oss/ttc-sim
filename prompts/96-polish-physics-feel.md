---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Physics.ts scripts/physics-test.mjs docs/sources.md
read: src/game/Game.ts
ctx: 32k
title: TTC 96: Polish: physics feel against documented TR figures
---
# TTC 96 · Polish: physics feel against documented TR figures

Depends on: all of 01-26. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/Physics.ts scripts/physics-test.mjs docs/sources.md`.

## Current behaviour
Every constant in Physics.ts is an ESTIMATE (mass 240 t, traction 1.1 m/s², service brake 1.3, emergency 1.6, jerk 0.8).

## Target
Use documented Toronto Rocket (TR) figures where a source is found in the repo docs. Otherwise keep the ESTIMATE and note "no source found". Notch response feels firm but smooth.

## Steps
1. Group the constants into `export const VEHICLE = { key: { value, basis } }`, keeping the exported names as aliases.
2. Only if `docs/sources.md` lists a TR figure (for example max speed 88 km/h), switch that basis to documented with the citation. Never invent a source.
3. Tune the jerk limit to 1.0 m/s³ (ESTIMATE) for snappier notch response, and check stopping-distance consistency.
4. Tests:
   - `assert('80→0 km/h service stop within 280 m', …)` (ESTIMATE target);
   - `assert('jerk never exceeds limit', …)`.

## Acceptance
- `npm test` passes, including the existing grade and power tests.

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
