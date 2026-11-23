---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Game.ts src/main.ts scripts/smoke-test.mjs
read: src/game/Atc.ts
ctx: 32k
title: TTC 16: ATC in the game: HUD target speed, penalty brake
---
# TTC 16 · ATC in the game: HUD target speed, penalty brake

Depends on: 15. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/Game.ts src/main.ts scripts/smoke-test.mjs`.

## Current behaviour
`Atc` exists but is unused. `main.ts` loads data with `json(url, required)`, and `GameData` is declared in Game.ts.

## Target
The HUD shows `ATC 55 → 35 in 240 m`. An overspeed warning shows in amber (`.warn`) and the penalty in red (`.bad`). The penalty forces the emergency brake until released (full brake lever at standstill).

## Steps
1. `main.ts`: load `./data/line1_speed.json` (optional) and pass `speed: { sections } | null` in GameData. Add the field to the interface in Game.ts.
2. `Game.ts`:
   - if sections exist, `this.atc = new Atc(sections)`;
   - each fixed step, call `update`;
   - on penalty set `physics.emergency = true`;
   - set `releaseRequested = input.lever <= -0.99`;
   - add the HUD lines;
   - `debug.atc = state`.
3. `smoke-test.mjs`: add `assert('ATC state exposed', typeof final.atc?.limitKmh === 'number')`.

## Acceptance
- `npm test` passes; the new assert and `no console errors` PASS.

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
