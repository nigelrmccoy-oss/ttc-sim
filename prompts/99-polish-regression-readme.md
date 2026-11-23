---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: scripts/smoke-test.mjs README.md docs/sources.md
read: src/game/Game.ts package.json
ctx: 32k
title: TTC 99: Polish: final full regression and README refresh
---
# TTC 99 · Polish: final full regression and README refresh

Depends on: all. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `scripts/smoke-test.mjs README.md docs/sources.md`.

## Current behaviour
The smoke test covers driving, the HUD, the station panel and the world stats. The README describes 0.2.0.

## Target
One end-to-end regression and a refreshed README.

## Steps
1. `smoke-test.mjs`: teleport to Union platform, stop, press `KeyO`, wait 3 s, and assert:
   - `doors open at a platform` (`debug.doors` starts with 'open');
   - after `KeyK` and 3.2 s, `doors closed and locked`;
   - `power panel exposed` (`debug.power.volts` > 0, if prompt 20 is in);
   - `atc exposed`.
2. `README.md`: refresh the features list, controls, tests (`npm test` chain), the estimates table pointing to `data/structure_depths.json`, the Game Coder prompts section, and the attribution. Remove anything stale.
3. `docs/sources.md`: make sure every new data file has a source row.

## Acceptance
- `npm test` passes, with every smoke assert PASS.

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
