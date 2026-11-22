---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Input.ts scripts/input-test.mjs README.md
read: src/game/Game.ts
ctx: 32k
title: TTC 12: Full Xbox controller mapping
---
# 12 · Full Xbox controller mapping

Depends on: none. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`.

## Context
`src/game/Input.ts` handles the keyboard plus a stub gamepad (RT = power, LT = brake) using the browser's standard mapping. Xbox controllers on Linux show up as `mapping === 'standard'` in Chromium.

## Task
1. Move the gamepad logic into a pure exported function: `mapPad(buttons: number[], axes: number[], prev: number[]) → { lever?, emergencyToggle, coast, camera, doorsOpen, doorsClose, mute, notch }`. `Input.update` calls it; the per-frame side effects stay in `Input`.
2. Mapping (standard layout indices):

   | Control | Action |
   |---|---|
   | RT (7) | power |
   | LT (6) | brake. While either trigger is past the 0.05 deadzone, `lever = RT − LT`. |
   | Left stick Y (axis 1) | notches the lever. Deadzone 0.2, using the existing `LEVER_RATE_PER_S`; up is power. |
   | D-pad up (12) / down (13) | notch ±0.1 per press |
   | A (0) | coast (lever 0) |
   | B (1) | emergency toggle |
   | Y (3) | camera |
   | X (2) | doors open |
   | LB (4) | doors close |
   | View (8) | mute |

   Buttons act on the press edge only, using `prev`. If the doors and mute features do not exist yet, still expose the flags; `Game.ts` may ignore them.
3. Create `scripts/input-test.mjs` with the esbuild loader pattern from `scripts/physics-test.mjs`. It tests: the deadzones, edge detection (holding B toggles once), trigger override, and that D-pad notching stays within −1..1.
4. Add a "Controls" table to `README.md` covering keyboard and Xbox.

## Acceptance
- `node scripts/input-test.mjs` passes, and `tsc` is clean.

## Test
`node scripts/input-test.mjs | tail -n 30`
`npx tsc --noEmit`

## Rules (every prompt)
- Edit only the files listed in `files:` above. Read the `read:` files for context; do not change them.
- Stack is Vite + TypeScript + Three.js. Keep `npx tsc --noEmit` clean.
- **Keys never get committed.** No API keys, tokens or passwords in code, data, logs or commit messages. None of these tasks need one.
- **Heavy runs go under the shared lock:** `flock /tmp/nigian-heavy-tests.lock <cmd>` for `npm test`, `npm run build`, bake scripts, Blender and anything that starts a browser.
- Headless only. Never open the game or a browser window on Nigel's screen. Kill any server you start.
- Trim output: send full logs to `logs/<name>.log` and look at them with `tail -n 40` or `grep`.
- Every number that is not from a cited source is labelled `ESTIMATE` in a comment or a `basis` field. No TTC logos, trademarks or copied sounds.
- Commit locally on the branch only. **Never push.** Nigel reviews first.
