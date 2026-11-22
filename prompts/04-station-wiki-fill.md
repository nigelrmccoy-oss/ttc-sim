---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: scripts/bake-stations-wiki.mjs public/data/line1_stations.json scripts/physics-test.mjs
read: src/game/Track.ts
ctx: 32k
title: TTC 04: Fill missing station neighbourhood and levels from offline Wikipedia
---
# 04 · Fill missing station neighbourhood and levels from offline Wikipedia

Depends on: none. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`.

## Context
`scripts/bake-stations-wiki.mjs` reads station articles from the local kiwix server at `http://127.0.0.1:8095`. That server serves `wikipedia_en_all_maxi_2026-08`, and the script writes `public/data/line1_stations.json`.
Today only 5 of 38 stations have `neighbourhood` and only 14 of 38 have `levels`. The functions to change are `neighbourhood(lead)` and `levels(rows, text)`, near lines 93–105.
The raw article caches live in `scripts/raw/wiki/*.json`. They are git-ignored and get rebuilt when they are missing.

## Task
1. kiwix lifecycle, inside the script: at start, `fetch('http://127.0.0.1:8095/')`.
   - If that fails, start the server and remember that you started it:
     `spawn('/mnt/240G/apps/kiwix/bin/kiwix-serve', ['--address=127.0.0.1', '--port=8095', '/mnt/1000G/kiwix/wikipedia_en_all_maxi_2026-08.zim'], { detached: true, stdio: 'ignore' })`
     Then wait up to 30 s for it to answer.
   - On exit, including on errors, kill it **only if this script started it**.
2. Neighbourhood: also look in the infobox rows labelled `Location`, `Address` or `Neighbourhood`, and in sentences such as "serves the X neighbourhood" or "located in X, a neighbourhood". Store it as `{ value, basis }`, where `basis` names the infobox row or quotes up to 120 characters of the sentence.
3. Levels: also count the "Platform level", "Concourse level" and similar rows in the article's station-layout table. If neither the table nor the text gives levels, leave `null`. **Never guess.**
4. In `physics-test.mjs`, add a test that every non-null `neighbourhood` and `levels` has a `basis`. Report the coverage counts in the test output; do not fail on them.

## Acceptance
- Coverage is printed, for example `neighbourhood 30/38, levels 25/38`. Whatever cannot be filled stays `null`.
- No kiwix process you started is left running (check with `pgrep -af kiwix-serve`).
- `node scripts/physics-test.mjs` passes.

## Test
`flock /tmp/nigian-heavy-tests.lock node scripts/bake-stations-wiki.mjs > logs/bake-stations.log 2>&1; grep -cE '^(ok|MISMATCH)' logs/bake-stations.log; tail -n 5 logs/bake-stations.log`
`pgrep -af kiwix-serve` shows only a kiwix that was already running before the bake (or nothing).
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
