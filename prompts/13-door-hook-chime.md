---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Game.ts src/game/Audio.ts index.html
read: src/game/DoorCycle.ts src/game/World.ts
ctx: 32k
title: TTC 13: Doors in the game: O/K keys, original TTC-style chime, traction interlock
---
# TTC 13 · Doors in the game: O/K keys, original TTC-style chime, traction interlock

Depends on: 11, 12. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/Game.ts src/game/Audio.ts index.html`.

## Current behaviour
`DoorCycle` exists but is unused. `Game.ts` has `this.layouts` (each with `s0`, `s1` and `name`) and `CONSIST_LENGTH_M` (138, ESTIMATE).

## Target
Doors open only when stopped with the whole train on a platform. Traction is cut until the interlock. An original synthesised chime plays. A HUD indicator shows door state.

## Steps
1. `Audio.ts`: add `chime(kind: 'open' | 'close')`.
   - Original synthesis: sine plus a soft triangle, each note with an 8 ms attack and exponential decay.
   - Close: three descending notes, G5–E5–C5 (783.99, 659.26, 523.25 Hz), 0.30 s apart, each ringing 0.72 s (the last 0.95 s).
   - Open: a single G5 for 0.65 s.
   - The note choice follows public descriptions of the TTC door-close tones (as cited in ION LRT's `DoorCycle.ts` header). It is synthesised, never sampled or copied.
   - Add `thud()`, a short low-passed noise burst for 'close-seated'.
2. `Game.ts`:
   - `this.doors = new DoorCycle()`.
   - `KeyO` → `requestOpen(v < 0.1 && s - CONSIST_LENGTH_M >= layout.s0 - 2 && s <= layout.s1 + 2)` for the current layout. `KeyK` → `requestClose()`.
   - Each frame, map the events to `audio.chime` / `thud`. If `!doors.tractionAllowed`, force `physics.lever = Math.min(physics.lever, 0)`.
   - `debug.doors = doors.phase + (doors.locked ? ' locked' : '')`.
3. `index.html`: add `<div id="doors"></div>` inside `#hud`. `Game.ts` writes `DOORS OPEN`, `DOORS CLOSING` or nothing to it.

## Acceptance
- `npm test` passes.
- Add no smoke assert in this prompt (smoke-test.mjs is not in files). Prompt 99 adds one.

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
