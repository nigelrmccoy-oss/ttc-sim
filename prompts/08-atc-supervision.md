---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Atc.ts src/game/Game.ts scripts/atc-test.mjs
read: src/game/Physics.ts public/data/line1_speed.json scripts/physics-test.mjs
ctx: 32k
title: TTC 08: ATC/CBTC-style speed supervision with penalty brake
---
# 08 · ATC/CBTC-style speed supervision with penalty brake

Depends on: 07. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`.

## Context
Line 1 runs automatic train control (CBTC, a moving block). This simplified version supervises only the civil speed limits from `public/data/line1_speed.json` (prompt 07) and the stop at the terminal. It does not model other trains yet. `TrainPhysics` is in `src/game/Physics.ts`.

## Task
1. Create `src/game/Atc.ts`. It must be pure, with no DOM and no Three.js.
   - `class Atc { constructor(sections); update(s, v, consistLen): { limitKmh, targetKmh, targetS, warn, penalty } }`
     - `limitKmh` is the lowest limit under the whole consist (`s - consistLen .. s`).
     - `targetKmh`/`targetS` are the next lower limit ahead within the braking distance plus 200 m.
     - The braking curve is `v² = vt² + 2·b·d` with `b = 0.8` m/s² (ESTIMATE service brake), so the ceiling at distance `d` is `sqrt(vt² + 2·b·d)`.
   - `warn` when `v` exceeds the ceiling plus 3 km/h.
   - `penalty` latches when `v` exceeds it plus 8 km/h. It releases only when `v == 0` **and** the driver has the lever at full brake.
2. In `Game.ts`: when `penalty` is set, set `physics.emergency = true` (or full brake) until it releases. HUD: show `ATC 55` with a target arrow `→ 35 in 240 m`, plus an overspeed warning in amber and the penalty in red. Put `atc` in `debug`.
3. Create `scripts/atc-test.mjs`, using the esbuild loader pattern from `physics-test.mjs`, to test:
   - the limit under the consist;
   - that the ceiling falls toward a lower section;
   - that `warn` comes before `penalty`;
   - that the penalty latches and then releases.
   Add it to the `npm test` chain in `package.json`. If `package.json` is not in `files`, run it by hand and say so.

## Acceptance
- `node scripts/atc-test.mjs` passes, `tsc` is clean and `npm test` passes.

## Test
`node scripts/atc-test.mjs | tail -n 30`
`flock /tmp/nigian-heavy-tests.lock npm test > logs/test.log 2>&1; grep -E 'FAIL|passed' logs/test.log | tail -n 40`

## Rules (every prompt)
- Edit only the files listed in `files:` above. Read the `read:` files for context; do not change them.
- Stack is Vite + TypeScript + Three.js. Keep `npx tsc --noEmit` clean.
- **Keys never get committed.** No API keys, tokens or passwords in code, data, logs or commit messages. None of these tasks need one.
- **Heavy runs go under the shared lock:** `flock /tmp/nigian-heavy-tests.lock <cmd>` for `npm test`, `npm run build`, bake scripts, Blender and anything that starts a browser.
- Headless only. Never open the game or a browser window on Nigel's screen. Kill any server you start.
- Trim output: send full logs to `logs/<name>.log` and look at them with `tail -n 40` or `grep`.
- Every number that is not from a cited source is labelled `ESTIMATE` in a comment or a `basis` field. No TTC logos, trademarks or copied sounds.
- Commit locally on the branch only. **Never push.** Nigel reviews first.
