---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Audio.ts
read: src/game/Physics.ts
ctx: 32k
title: TTC 10: Synthesised traction motor and rolling sound module
---
# TTC 10 · Synthesised traction motor and rolling sound module

Depends on: none. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/Audio.ts`.

## Current behaviour
The game has no sound.

## Target
A Web Audio module (no audio files) that the next prompt wires into the game.

## Steps
1. Create `src/game/Audio.ts` exporting `class TrainAudio` with `start(): void`, `setMuted(m: boolean)`, `update(vMs: number, lever: number, inTunnel: boolean, dt: number)` and `readonly started: boolean`, `muted: boolean`.
2. `start()` creates the AudioContext lazily inside try/catch and never throws (headless Chromium may have no audio device).
3. Motor whine: two detuned sawtooth oscillators → low-pass filter.
   - Pitch = 60 + 840 · min(1, v/24.4) Hz (ESTIMATE, tuned by ear).
   - Gain = 0.25 · |lever| while powering or braking, otherwise 0.03.
4. Rolling: a looped white-noise buffer → band-pass at 300-900 Hz. Gain rises with speed. In tunnels: +3 dB and a slightly lower filter (ESTIMATE).
5. All parameter changes use `setTargetAtTime(…, 0.05)`.
6. No copied recordings, no samples.

## Acceptance
- `npx tsc --noEmit` is clean. Nothing imports Audio.ts yet, so the build and smoke tests are unchanged and PASS.

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
