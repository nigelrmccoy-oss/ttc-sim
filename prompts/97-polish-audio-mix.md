---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Audio.ts
read: src/game/Game.ts
ctx: 32k
title: TTC 97: Polish: audio mix levels
---
# TTC 97 · Polish: audio mix levels

Depends on: 13. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/Audio.ts`.

## Current behaviour
The motor, rolling and chimes use ad-hoc gains.

## Target
A master bus with a DynamicsCompressor and these levels (ESTIMATE, by ear):
- chimes −6 dBFS peak;
- motor −14 dB;
- rolling −18 dB;
- tunnel +3 dB with a short convolver-free slap-back echo (a delay of 60 ms at −12 dB).
Ducking: chimes duck the motor by 6 dB for 1 s.

## Steps
1. Add `master` (GainNode → DynamicsCompressor → destination) and route everything through it.
2. Add a `MIX` constant object with the levels above (dB) and `dbToGain()`.
3. Implement the ducking in `chime()`.

## Acceptance
- `npx tsc --noEmit` is clean and `npm test` passes. With no audio device, nothing throws.

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
