---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Game.ts src/game/Physics.ts src/main.ts
read: src/game/TractionPower.ts
ctx: 32k
title: TTC 20: Use line voltage in physics and show a power panel
---
# TTC 20 · Use line voltage in physics and show a power panel

Depends on: 19. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/Game.ts src/game/Physics.ts src/main.ts`.

## Current behaviour
TractionPower is unused.

## Target
Available traction scales with line voltage. The HUD shows `600 V · 1.2 kA · regen 40%`. `debug.power` is exposed.

## Steps
1. `Physics.ts`: add `powerScale = 1` (a public field) that multiplies the traction force cap.
   The existing physics tests must still pass with powerScale = 1.
2. `main.ts`: load `./data/line1_substations.json` (optional) into `GameData.substations`.
3. `Game.ts`: each fixed step, compute `tractionW = max traction force × v` (power positive, regen negative) and call `samplePower`.
   Set `physics.powerScale = r.tractionScale` and `debug.power = r`. Add one HUD line.

## Acceptance
- `npm test` passes, including `full power still climbs a 4% grade from rest`.

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
