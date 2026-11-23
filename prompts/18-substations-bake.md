---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: scripts/bake-substations.mjs package.json .gitignore
read: scripts/raw/osm-substations.json scripts/lib-geo.mjs public/data/line1.json
ctx: 32k
title: TTC 18: Traction substations from OSM (600 V DC third rail), ESTIMATE gaps
---
# TTC 18 · Traction substations from OSM (600 V DC third rail), ESTIMATE gaps

Depends on: none. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `scripts/bake-substations.mjs package.json .gitignore`.

## Current behaviour
`scripts/raw/osm-substations.json` holds a committed Overpass result: 27 power=substation/converter features within 400 m of Line 1.
Of these, 6 have operator TTC / Toronto Transit Commission (one named "Orde Substation") and 1 has substation=traction. The rest belong to Hydro or are untagged.
Line 1 uses a 600 V DC third rail (documented system voltage; the TTC subway is commonly cited at 600 V DC. Note it as "verify").

## Target
`public/data/line1_substations.json` is generated in `bake:derived`: TTC/traction sites projected to chainage, plus ESTIMATE filler sites wherever a gap exceeds 2.5 km.

## Steps
1. Create `scripts/bake-substations.mjs`:
   - keep features with operator matching /TTC|Toronto Transit/ or `substation=traction`;
   - project each to chainage (nearest track point) and keep those within 400 m;
   - output `{ source: 'OpenStreetMap contributors, ODbL', nominalV: 600, sites: [{ s, name, osmId, confidence: 'osm' | 'estimate', basis }] }`, sorted by `s`.
2. In every gap longer than 2500 m, insert `confidence: 'estimate'` sites, evenly spaced, with basis "ESTIMATE: TTC substations not all mapped in OSM".
3. package.json: append ` && node scripts/bake-substations.mjs > logs/bake-substations.log` to `bake:derived`.
4. .gitignore: add `public/data/line1_substations.json`.

## Acceptance
- `npm test` passes. The bake prints `N osm + M estimate sites`, no gap exceeds 2.5 km, and it exits 1 otherwise.

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
