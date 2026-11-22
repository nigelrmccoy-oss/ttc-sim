---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Train.ts src/main.ts
read: public/models/README.md src/game/Game.ts
ctx: 32k
title: TTC 11: Use the TR GLB models in the game with a box fallback
---
# 11 · Use the TR GLB models in the game with a box fallback

Depends on: 10. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`.

## Context
Prompt 10 writes `public/models/tr_cab.glb` and `tr_mid.glb`. `Train.ts` builds box cars, and `Train.place(track, s)` positions each car with `car.lookAt(front)`.

## Task
1. In `main.ts`, preload the two GLBs with `GLTFLoader` from `three/examples/jsm/loaders/GLTFLoader.js`. A missing file is fine: fall back to the boxes, never fail.
2. In `Train.ts`, accept optional templates `{ cab, mid }`. Clone them per car: cab at both ends of the consist (rotate the rear one 180°) and mid in between. Keep the existing car length constant in step with the model. If they differ, the model wins: update the consist length and export it.
3. Keep `castShadow` on the bodies, and keep the headlight anchor where it is today.
4. `debug.trainModel` is `'glb'` or `'boxes'`.

## Acceptance
- `tsc` is clean and `npm test` passes, with `debug.trainModel === 'glb'` when the files exist.
- With the files temporarily renamed, the game still runs and reports `boxes`. Rename them back afterwards.

## Test
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
