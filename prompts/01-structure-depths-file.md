---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: scripts/bake-profile.mjs data/structure_depths.json scripts/physics-test.mjs
read: docs/sources.md
ctx: 32k
title: TTC 01: Move tunnel depth parameters into a cited data file
---
# TTC 01 · Move tunnel depth parameters into a cited data file

Depends on: none. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `scripts/bake-profile.mjs data/structure_depths.json scripts/physics-test.mjs`.

## Current behaviour
`scripts/bake-profile.mjs` (lines ~24-36) has an inline `const STRUCTURE = { key: { value, basis } }` with 11 keys:
maxGradePct, tysseBoredRailDepth, tysseStationRailDepth, boreInternalDiameter, yonge1954BoxRailDepth, universityBoredRailDepth,
otherBoxRailDepth, boxHeightAboveRail, portalCover, rosedaleCutDepth, verticalCurveRadius. The rest of the script reads `STRUCTURE.<key>.value`.
The baked profile copies `STRUCTURE` into its `structure` field.

## Target
The values live in `data/structure_depths.json` with status and source per entry; the bake reads that file; the output is unchanged.

## Steps
1. Create `data/structure_depths.json` as
   `{ "note": "Line 1 structure parameters. status: documented | estimate | estimate-in-documented-range", "entries": { "<key>": { "value": <number>, "unit": "m" | "%", "status": "...", "basis": "<copy of today's basis text>", "source": { "title": "...", "url": "..." } | null } } }`
   for all 11 keys with today's values. Take the source titles and URLs from `docs/sources.md`. Use `null` when the basis says ESTIMATE with no source.
2. In `bake-profile.mjs`, replace the inline literal with
   `const STRUCTURE = JSON.parse(fs.readFileSync(path.join(root, 'data/structure_depths.json'), 'utf8')).entries;`
   Keep every `STRUCTURE.<key>.value` use unchanged.
3. In `scripts/physics-test.mjs`, under `// ---------- Profile ----------`, add these tests:
   - `assert('structure file: every entry has status and basis', …)`
   - `assert('structure file: documented entries cite a URL', …)`: every `status === 'documented'` entry has a non-empty `source.url`.
   - `assert('profile.structure matches data/structure_depths.json', …)`: compare the `value`s key by key.

## Acceptance
- The three new tests PASS. All existing profile tests still PASS, including `max grade within the documented 4%`, `platforms are level` and `rail is below ground at portals`.
- The baked `rail` array is identical to before. Same values give the same profile.

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
