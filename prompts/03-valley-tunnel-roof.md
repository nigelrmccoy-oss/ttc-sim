---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: scripts/bake-profile.mjs scripts/physics-test.mjs public/data/line1_profile.json
read: src/game/World.ts
ctx: 32k
title: TTC 03: Fix tunnel roof poking above ground at Hogg’s Hollow and Cedarvale
---
# 03 · Fix tunnel roof poking above ground at Hogg’s Hollow and Cedarvale

Depends on: 01 (optional). Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`.

## Context
In `public/data/line1_profile.json`, each array is sampled every 5 m: `ground` and `rail` (both metres), `cls` (`tunnel`/`open`/`bridge`) and `construction`. Chainage 0 is Vaughan Metropolitan Centre.
The box roof is `rail + boxHeightAboveRail` (5.0 m, an ESTIMATE). It sits above `ground` on these runs (as baked at commit 7db5caf):

| km | samples | worst roof above ground | construction | place |
|---|---|---|---|---|
| 33.77–34.38 | 116 | 6.8 m | box | Hogg's Hollow / York Mills valley (West Don) |
| 17.37–17.54 | 35 | 2.7 m | box | Cedarvale ravine, near 18 km between Eglinton West and St Clair West |
| 27.23–27.28 | 12 | 2.8 m | box (Yonge 1954) | small dip, minor |
| 10.09–10.18 | 19 | 6.3 m | covered way | already rendered as a covered berm, leave it |

## Task
1. In `bake-profile.mjs`, add a `VALLEY_CROSSINGS` table: `[{ name, s0, s1, treatment: 'lower' | 'covered', minCoverM, basis }]`. Every entry's `basis` says `ESTIMATE` unless a source is cited.
   - `lower`: before the final grade-limit pass, cap the rail in `[s0, s1]` at `ground - boxHeightAboveRail - minCoverM` (default 1.0 m). Then let the existing forward/backward grade limiter and vertical-curve fit smooth it out. Platforms must stay level.
   - `covered`: set `construction` to `covered way` for the samples whose roof is still above ground. The renderer already draws those as a berm.
2. Use `lower` for Hogg's Hollow and Cedarvale. If the 4% cap makes full cover impossible, cover as much as the cap allows and mark the rest `covered`.
3. In `physics-test.mjs`, add a test: no `tunnel` sample with `construction` other than `covered way` has its roof above ground, with a tolerance of 0.1 m.

## Acceptance
- The new test passes, and all existing profile tests still pass (max grade ≤ 4.05%, step limit, level platforms, portals below ground).
- The bake log prints the worst remaining roof-above-ground per crossing.

## Test
`PROFILE_ONLY=1 flock /tmp/nigian-heavy-tests.lock node scripts/bake-profile.mjs > logs/bake-profile.log 2>&1; tail -n 30 logs/bake-profile.log`
`flock /tmp/nigian-heavy-tests.lock node scripts/physics-test.mjs | tail -n 40`

## Rules (every prompt)
- Edit only the files listed in `files:` above. Read the `read:` files for context; do not change them.
- Stack is Vite + TypeScript + Three.js. Keep `npx tsc --noEmit` clean.
- **Keys never get committed.** No API keys, tokens or passwords in code, data, logs or commit messages. None of these tasks need one.
- **Heavy runs go under the shared lock:** `flock /tmp/nigian-heavy-tests.lock <cmd>` for `npm test`, `npm run build`, bake scripts, Blender and anything that starts a browser.
- Headless only. Never open the game or a browser window on Nigel's screen. Kill any server you start.
- Trim output: send full logs to `logs/<name>.log` and look at them with `tail -n 40` or `grep`.
- Every number that is not from a cited source is labelled `ESTIMATE` in a comment or a `basis` field. No TTC logos, trademarks or copied sounds.
- Commit locally on the branch only. **Never push.** Nigel reviews first.
