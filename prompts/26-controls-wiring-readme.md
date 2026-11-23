---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Game.ts index.html README.md
read: src/game/Input.ts
ctx: 32k
title: TTC 26: Wire the gamepad door and mute buttons, update the help text and README controls
---
# TTC 26 · Wire the gamepad door and mute buttons, update the help text and README controls

Depends on: 13, 25. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/Game.ts index.html README.md`.

## Current behaviour
The gamepad flags from prompt 25 are not consumed. The `#help` text in index.html lists the keyboard plus RT/LT only.

## Target
Gamepad X/LB/View act like O/K/M. The help line and the README "Controls" section list keyboard and Xbox controls.

## Steps
1. `Game.ts`: consume `input.doorsOpenPressed`, `doorsClosePressed` and `mutePressed` each frame, using the same handlers as the keys.
2. `index.html` `#help`: add `O/K doors · M mute · Xbox: RT/LT power/brake, A coast, B emergency, Y camera, X/LB doors`.
3. `README.md` "## Controls": a keyboard | Xbox | action table.

## Acceptance
- `npm test` passes.

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
