---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/style.css index.html src/game/Game.ts
read: scripts/smoke-test.mjs
ctx: 32k
title: TTC 90: Polish: HUD layout and readability
---
# TTC 90 · Polish: HUD layout and readability

Depends on: all of 01-26. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/style.css index.html src/game/Game.ts`.

## Current behaviour
The HUD is one bottom-left box: 48 px speed plus pre-formatted lines. The station panel is top-left and the help text top-right, 12 px.

## Target
A readable cab HUD at 1280×720 and 1920×1080:
- speed and ATC target large;
- grade / section / power / doors as compact labelled rows;
- nothing overlaps the attribution;
- contrast ≥ 4.5:1;
- help collapsible with `H`.

## Steps
1. Restructure `#hud` into a CSS grid:
   - big speed with a small ATC limit on its right;
   - rows: Next, Grade (% and ‰), Section, Power, Doors.
   Use `font-variant-numeric: tabular-nums`, with the `.warn`/`.bad` colours kept.
2. `H` toggles `#help` (hidden by default after 10 s).
3. `updateHud()` writes into fixed row elements by id, not into one pre block.

## Acceptance
- `npm test` passes. `HUD shows speed and next station` still PASSES, so keep the `km/h` and `Next:` text.

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
