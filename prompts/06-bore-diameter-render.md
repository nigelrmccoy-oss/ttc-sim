---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/World.ts
read: src/game/Track.ts
ctx: 32k
title: TTC 06: Render each bored section with its own diameter
---
# TTC 06 · Render each bored section with its own diameter

Depends on: 04. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/World.ts`.

## Current behaviour
`World.ts` draws every 'bored…' section with `boredSection()` using one `BORE_ID_M = 5.4` (TYSSE, documented).
`otherTrackLat()` returns null in bored sections (twin single-track tubes).

## Target
Diameter per section: TYSSE 5.4 m (documented); North Yonge 4.9 m (documented); Spadina under Casa Loma 4.9 m (ESTIMATE, same era); University 5.4 m (ESTIMATE, keep).

## Steps
1. Add `export const BORE_ID_BY_CONSTRUCTION: Record<string, { id: number; basis: string }>` covering the four labels above. Default to 5.4 for an unknown 'bored…' label.
2. Change `boredSection()` to `boredSection(idM: number)`. Where the sweep is built (~line 216), split bored runs by construction label and pass the matching diameter. Keep `BORE_AXIS_ABOVE_RAIL_M`, scaled as `idM/2 - 1.0` (ESTIMATE: rail about 1 m above the invert).
3. Keep the twin-tube behaviour: `otherTrackLat` stays null for all bored labels.

## Acceptance
- `npx tsc --noEmit` is clean.
- The smoke test `world built with tunnels, viaducts and portals` passes, and `boredM` in the debug world stats is more than 12000.

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
