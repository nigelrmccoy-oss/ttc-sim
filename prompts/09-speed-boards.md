---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/World.ts src/main.ts
read: public/data/line1_speed.json src/game/Track.ts
ctx: 32k
title: TTC 09: Lineside speed boards
---
# 09 · Lineside speed boards

Depends on: 07. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`.

## Context
`buildWorld(scene, track, layouts)` in `src/game/World.ts` builds the scenery in 500 m chunks. Station signs are made from a 2048 px canvas texture; copy that approach. `src/main.ts` loads the data files with `json(url, required)`.

## Task
1. In `main.ts`, load `./data/line1_speed.json` (optional, `required = false`) and pass its `sections` through to `buildWorld`. Add an optional parameter and keep the old calls working.
2. In `World.ts`, place a board 30 m before every section start where the limit changes, and a "limit ends" board where it rises.
   - Make it a generic design of your own (not a TTC sign): a white rectangle 0.6 × 0.8 m with a black border and black numerals (km/h) on a canvas texture, mounted on a 1.6 m post or on the tunnel wall at cab-window height, on the driver's side (right in the direction of travel).
   - Use one `CanvasTexture` per distinct number and share the materials.
3. Add `speedBoards: n` to `WorldStats`.

## Acceptance
- `tsc` is clean and `npm test` passes, with draw calls in the GPU smoke test up by less than 10%.
- `worldStats.speedBoards > 0`.

## Test
`flock /tmp/nigian-heavy-tests.lock npm test > logs/test.log 2>&1; grep -E 'FAIL|passed|world built' logs/test.log | tail -n 40`

## Rules (every prompt)
- Edit only the files listed in `files:` above. Read the `read:` files for context; do not change them.
- Stack is Vite + TypeScript + Three.js. Keep `npx tsc --noEmit` clean.
- **Keys never get committed.** No API keys, tokens or passwords in code, data, logs or commit messages. None of these tasks need one.
- **Heavy runs go under the shared lock:** `flock /tmp/nigian-heavy-tests.lock <cmd>` for `npm test`, `npm run build`, bake scripts, Blender and anything that starts a browser.
- Headless only. Never open the game or a browser window on Nigel's screen. Kill any server you start.
- Trim output: send full logs to `logs/<name>.log` and look at them with `tail -n 40` or `grep`.
- Every number that is not from a cited source is labelled `ESTIMATE` in a comment or a `basis` field. No TTC logos, trademarks or copied sounds.
- Commit locally on the branch only. **Never push.** Nigel reviews first.
