---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: scripts/bake-stations-wiki.mjs public/data/line1_stations.json scripts/physics-test.mjs
read: src/game/Track.ts
ctx: 32k
title: TTC 09: Fill station neighbourhood and levels from the cached Wikipedia HTML
---
# TTC 09 · Fill station neighbourhood and levels from the cached Wikipedia HTML

Depends on: none. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `scripts/bake-stations-wiki.mjs public/data/line1_stations.json scripts/physics-test.mjs`.

## Current behaviour
`scripts/bake-stations-wiki.mjs` reads full article HTML from `scripts/raw/wiki-html/*.html`. That cache is git-ignored, is already filled for all 38 stations, and has `<!-- title: … -->` on line 1.
`npm test` runs it offline (`WIKI_OFFLINE=1`) through `test:data` and rewrites `public/data/line1_stations.json`.
Only 5 of 38 stations have `neighbourhood`, and 14 of 38 have `levels`. The functions to improve are `levels(rows, text)` and `neighbourhood(lead)`, around lines 110-125.

## Target
More stations filled, each value with a `basis`. Values never guessed: unknown stays `null`.

## Steps
1. `neighbourhood` becomes `{ value, basis }`. Look in:
   - the infobox rows `Neighbourhood`, `Location` or `Address` (take the place name before ", Toronto");
   - sentences such as "serves the X neighbourhood" or "located in X, a neighbourhood".
   `basis` = the row label or a quote of at most 120 chars.
2. `levels` (already `{ value, basis }`): also count distinct rows in the article's station-layout table containing "level" (for example "Street level", "Concourse", "Platform level"), using `<table class="wikitable"` sections that contain "Platform level".
3. Do not fetch anything. The cache has every article. (Kiwix at 127.0.0.1:8095 is only needed if the cache is deleted; a person starts and stops it then.)
4. In physics-test.mjs, add:
   - `assert('station neighbourhood/levels values carry a basis', every non-null has basis)`;
   - `assert('station coverage reported', true, 'neighbourhood N/38, levels M/38')`.

## Acceptance
- `npm test` passes; the new tests PASS.
- The detail line shows neighbourhood ≥ 20/38 and levels ≥ 25/38. If lower, list in the reply which stations have no source text.

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
