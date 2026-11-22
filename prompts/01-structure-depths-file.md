---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: scripts/bake-profile.mjs data/structure_depths.json scripts/physics-test.mjs
read: docs/sources.md
ctx: 32k
title: TTC 01: Move tunnel depth parameters into a cited data file
---
# 01 · Move tunnel depth parameters into a cited data file

Depends on: none. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`.

## Context
`scripts/bake-profile.mjs` builds `public/data/line1_profile.json` (the rail elevation every 5 m along Line 1).
Near line 25 it has a `STRUCTURE` object, where each entry is `{ value, basis }`. `basis` says whether the value is documented or an ESTIMATE.
Some entries are documented: `maxGradePct` 4.0 and `boreInternalDiameter` 5.4. The others are estimates.

## Task
1. Create `data/structure_depths.json`:
   `{ "note": "...", "entries": { "<key>": { "value": n, "unit": "m"|"%", "status": "documented"|"estimate"|"estimate-in-documented-range", "basis": "...", "source": { "title": "...", "url": "..." } | null } } }`
   Use the same keys, values and basis text as `STRUCTURE` today. Copy the source titles and URLs from `docs/sources.md`.
2. In `bake-profile.mjs`, replace the inline `STRUCTURE` literal with a load of that file. Keep the `STRUCTURE.key.value` access shape so the rest of the script is unchanged. Keep writing `structure` into the profile JSON.
3. In `scripts/physics-test.mjs`, add a test: every entry has `status` and `basis`; every `documented` entry has a non-empty `source.url`; and the profile's `structure` matches the file.

## Acceptance
- `PROFILE_ONLY=1 node scripts/bake-profile.mjs` gives the same `rail` array as before, so rerunning changes nothing.
- `node scripts/physics-test.mjs` passes, including the new test.

## Test
`PROFILE_ONLY=1 flock /tmp/nigian-heavy-tests.lock node scripts/bake-profile.mjs > logs/bake-profile.log 2>&1; tail -n 20 logs/bake-profile.log`
`git diff --stat public/data/line1_profile.json` shows no change.
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
