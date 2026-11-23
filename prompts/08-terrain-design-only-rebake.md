---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: scripts/bake-profile.mjs package.json .gitignore
read: scripts/lib-geo.mjs
ctx: 32k
title: TTC 08: Fast design-only terrain rebake (no HRDEM refetch)
---
# TTC 08 · Fast design-only terrain rebake (no HRDEM refetch)

Depends on: 01. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `scripts/bake-profile.mjs package.json .gitignore`.

## Current behaviour
A full `node scripts/bake-profile.mjs` re-samples HRDEM for 120 terrain tiles over the network, then carves them (`carve(h0, x, z)` ~line 300).
`PROFILE_ONLY=1` skips the terrain completely, so every profile change needs a slow network rebake. ION LRT has `--design-only`, which re-carves from cached raw heights.

## Target
`DESIGN_ONLY=1 node scripts/bake-profile.mjs` re-carves terrain from a local raw-height cache in seconds, offline.

## Steps
1. In the terrain section, write the uncarved per-tile heights to `scripts/raw/terrain-raw.bin`, plus `scripts/raw/terrain-raw.json` with `{ tiles: ["x,y"...], grid: 129, format: "Float32 LE" }`.
2. When `process.env.DESIGN_ONLY` is set and the cache exists, read the raw heights from it instead of calling `sampleHrdem`. Throw a clear error if the cache is missing.
3. Add `"bake:design": "DESIGN_ONLY=1 node scripts/bake-profile.mjs"` to package.json.
4. Add `scripts/raw/terrain-raw.*` to .gitignore; it is about 8 MB and rebuildable.

## Acceptance
- `npm test` passes; nothing changes when DESIGN_ONLY is unset.
- The bake logs `terrain: design-only from cache` when DESIGN_ONLY=1.

## Test
`flock /tmp/nigian-heavy-tests.lock npm test`, run from `/home/nig/ttc-sim`. The queue runs it as the gate. Print nothing secret.

## Manual follow-up (not for Devstral)
Once, after merge: `flock /tmp/nigian-heavy-tests.lock node scripts/bake-profile.mjs` (network) to create the raw cache.

## Rules
- Edit **only** the files in `files:`. Any other edit fails the step. `read:` files are context only.
- You cannot run shell commands. The queue runs the gate itself: `npx tsc --noEmit`, then `flock /tmp/nigian-heavy-tests.lock npm test`, then the Code Checker.
  `npm test` = `test:data` (re-bakes `public/data/line1_profile.json` from `scripts/bake-profile.mjs`; it is generated and git-ignored) → `test:physics` → `build` → `test:smoke` (headless). Nigel's manual run is `flock /tmp/nigian-heavy-tests.lock npm test` from `/home/nig/ttc-sim`.
- **Never commit keys**: no API keys, tokens or passwords in code, data, comments or logs. Nothing here needs one.
- **No TTC logos, wordmarks, roundels or trademarks, and no copied sounds or images.** Original synthesis and generic designs only.
- **Label estimates**: any number not taken from a cited source carries `ESTIMATE` in a comment or a `basis` field. Never invent a citation.
- Headless only; never open a window on Nigel's screen. Keep `window.__ttcSim` (with `.debug`) and `window.__ttcSimTeleport(s)` working, because the smoke test uses them.
- Chainage `s` is metres from Vaughan Metropolitan Centre (s = 0) to Finch (about 38 721 m).
