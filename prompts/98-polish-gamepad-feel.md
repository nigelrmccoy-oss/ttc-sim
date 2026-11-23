---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Input.ts scripts/input-test.mjs
read: src/game/Game.ts
ctx: 32k
title: TTC 98: Polish: gamepad feel and dead zones
---
# TTC 98 · Polish: gamepad feel and dead zones

Depends on: 25. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/Input.ts scripts/input-test.mjs`.

## Current behaviour
The dead zones are fixed (0.05 triggers, 0.2 stick) and linear.

## Target
Radial stick dead zone 0.18 with a rescaled response curve (power 1.6), trigger dead zone 0.06 with an outer dead zone at 0.97, and optional rumble (`vibrationActuator.playEffect`) on penalty brake and door lock, guarded if unsupported. All values are ESTIMATEs.

## Steps
1. Implement `shape(v, inner, outer, gamma)` and use it for the triggers and stick.
2. Add `Input.rumble(kind: 'penalty' | 'doors')`, a no-op if unsupported.
3. Tests:
   - `assert('stick response is monotonic and 0 inside dead zone', …)`;
   - `assert('trigger reaches 1 at outer dead zone', …)`.

## Acceptance
- `npm test` passes; the earlier input tests still PASS.

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
