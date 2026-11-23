---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: scripts/bake-profile.mjs scripts/physics-test.mjs
read: docs/depth-findings.md
ctx: 32k
title: TTC 07: Platform grade clamp (documented 0.3%) instead of dead-level pins
---
# TTC 07 · Platform grade clamp (documented 0.3%) instead of dead-level pins

Depends on: 01. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `scripts/bake-profile.mjs scripts/physics-test.mjs`.

## Current behaviour
Platforms are pinned dead level, and the test `platforms are level` requires a rise of 0.000 m.
TTC design criteria allow ±0.3% through stations (VNSL 2007 design table; cited in docs/depth-findings.md §D). ION LRT's bake uses the same idea as `PLATFORM_MAX_GRADE`.

## Target
A single `PLATFORM_MAX_GRADE = 0.003` clamp. The platform profile may follow the alignment up to ±0.3%, which removes kinks at platform ends.

## Steps
1. In bake-profile.mjs, add `const PLATFORM_MAX_GRADE = 0.003; // documented: TTC design criteria ±0.3% through stations (VNSL 2007 Response to Conditions of Approval, design-criteria table)`.
2. Replace the level pin: over each platform, fit a straight line to the unpinned rail, clamp its slope to ±PLATFORM_MAX_GRADE, and pin the platform samples to that line.
3. In physics-test.mjs, rename `platforms are level` to `platform grade within ±0.3%`, asserting `|rise| / length <= 0.0031` per platform.

## Acceptance
- `platform grade within ±0.3%` PASSES, and every other profile test still PASSES.

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
