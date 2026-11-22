---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Audio.ts src/game/Game.ts index.html
read: src/game/World.ts src/game/Track.ts
ctx: 32k
title: TTC 06: Doors at stations with a synthesised chime
---
# 06 · Doors at stations with a synthesised chime

Depends on: 05. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`.

## Context
`Game.ts` has `this.layouts: StationLayout[]`, each with `s0`/`s1` platform ends and a name, and a `nextStation(headS)` helper. There are no doors yet. `TrainAudio` comes from prompt 05.

## Task
1. Door state machine in `Game.ts`: `closed → opening → open → closing → closed`.
   - The doors may open only when `v < 0.1` m/s and the whole consist is inside a platform (`s - CONSIST_LENGTH_M >= s0 - 2` and `s <= s1 + 2`).
   - Keys: `O` opens, `K` closes (keep `D` free). Opening and closing each take 2.5 s (ESTIMATE).
   - While the doors are not `closed`, traction is cut: force `physics.lever = min(lever, 0)`.
2. Audio: add `chime(kind: 'open' | 'close')` to `TrainAudio`. Use an **original** two- or three-note sine/triangle chime with a short decay. The close chime should be more urgent, for example three quick descending notes. Do not imitate any real TTC recording.
3. HUD: a `DOORS OPEN` / `CLOSING` indicator. Add an element `#doors` to `index.html` next to the existing HUD.
4. `debug.doors` holds the state string, for the smoke test.

## Acceptance
- `tsc` is clean and `npm test` passes.
- Manual check, headless only: teleport with `window.__ttcSimTeleport(s)` to a platform, press `O`, and `debug.doors` goes to `open`. Pressing `W` does not move the train until `K` and the doors read `closed`.

## Test
`npx tsc --noEmit`
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
