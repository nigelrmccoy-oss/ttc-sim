---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/World.ts src/game/Game.ts
read: src/game/Atc.ts
ctx: 32k
title: TTC 17: Lineside speed boards (generic design)
---
# TTC 17 · Lineside speed boards (generic design)

Depends on: 16. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/World.ts src/game/Game.ts`.

## Current behaviour
There are no speed boards. Station signs use a canvas texture (see the 2048 px sign code in World.ts).

## Target
A board 30 m before each lower limit and a "limit ends" board where the limit rises. The design is generic: a white 0.6 × 0.8 m panel, black border, black numerals, on the right side at cab-window height.

## Steps
1. Change `buildWorld(scene, track, layouts)` to take an optional 4th parameter `speed?: {s0;s1;limitKmh}[]`. `Game.ts` passes `data.speed?.sections`.
2. Create one CanvasTexture per distinct number and share materials. Mount the boards on the tunnel wall (box: lateral `BOX_HALF_CLEAR_M - 0.1`; bored: radius − 0.3) or on a 1.6 m post outdoors.
3. Add `speedBoards` to `WorldStats`.

## Acceptance
- `npm test` passes. `world.speedBoards > 0` shows in the debug output, and the draw calls in the `views` lines rise by less than 10%.

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
