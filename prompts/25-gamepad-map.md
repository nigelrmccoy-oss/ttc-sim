---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Input.ts scripts/input-test.mjs package.json
read: src/game/Game.ts
ctx: 32k
title: TTC 25: Full Xbox controller mapping (pure, tested)
---
# TTC 25 · Full Xbox controller mapping (pure, tested)

Depends on: none. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/Input.ts scripts/input-test.mjs package.json`.

## Current behaviour
`Input.ts` reads RT (button 7) = power and LT (6) = brake only, with a 0.05 dead zone. When either is pressed it overrides the keyboard lever.

## Target
An exported pure `mapPad(buttons: number[], axes: number[], prev: number[])` covering the whole mapping, with press-edge detection.

## Steps
1. Mapping, standard layout:
   - RT 7 power, LT 6 brake, `lever = RT − LT` when either is past 0.05;
   - left stick Y (axis 1) notches the lever at `LEVER_RATE_PER_S`, dead zone 0.2, up = power;
   - D-pad 12/13: ±0.1 per press;
   - A 0 coast; B 1 emergency toggle; Y 3 camera; X 2 doors open; LB 4 doors close; View 8 mute.
   Output `{ lever?, notch, coast, emergencyToggle, camera, doorsOpen, doorsClose, mute }`.
2. `Input.update()` uses it. Add public flags `doorsOpenPressed`, `doorsClosePressed` and `mutePressed` (cleared by consumers).
3. Create `scripts/input-test.mjs` (esbuild loader). Asserts:
   - `trigger dead zone`;
   - `stick dead zone`;
   - `B toggles once per press`;
   - `D-pad notch clamps to [-1,1]`.
4. package.json: `test:input` in the chain.

## Acceptance
- `npm test` passes, with the four input tests PASS.

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
