---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/DoorCycle.ts scripts/doors-test.mjs package.json
read: src/game/Physics.ts
ctx: 32k
title: TTC 12: Door cycle state machine (ION LRT timing) with tests
---
# TTC 12 · Door cycle state machine (ION LRT timing) with tests

Depends on: none. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/DoorCycle.ts scripts/doors-test.mjs package.json`.

## Current behaviour
There are no doors.

## Target
A pure, DOM-free state machine using ION LRT's documented-by-design timeline: close chime at 0 s, door motion at 0.85 s, leaves seated at 2.85 s (2.0 s travel), interlock at 2.95 s.
Open: chime at 0 s, motion 0.22-2.02 s. All timings are ESTIMATEs carried over from ION LRT's `DoorCycle.ts` (read for reference only: /home/nig/ion-LRT/src/game/DoorCycle.ts; never edit it).

## Steps
1. Create `src/game/DoorCycle.ts`:
   - `export const DOOR_TIMING = { closeMotionStartS: 0.85, closeMotionDurS: 2.0, closeLockDelayS: 0.10, openMotionStartS: 0.22, openMotionDurS: 1.80 }` with ESTIMATE comments;
   - `export type DoorPhase = 'closed'|'opening'|'open'|'closing'`;
   - `export class DoorCycle { phase; t; requestOpen(canOpen: boolean): boolean; requestClose(): void; update(dt): DoorEvent[]; get locked(): boolean; get tractionAllowed(): boolean }`.
   Events: 'open-chime', 'open-motion', 'opened', 'close-chime', 'close-motion', 'close-seated', 'close-locked'.
   `tractionAllowed` is true only when `phase === 'closed' && locked`.
2. Create `scripts/doors-test.mjs`, copying the esbuild `load()` helper from `scripts/physics-test.mjs`. Assert:
   - `close: chime at 0, motion at 0.85, seated at 2.85, locked at 2.95 (±1 step)`;
   - `traction cut until locked`;
   - `cannot open when canOpen is false`;
   - `open→close mid-opening reverses safely`.
3. In package.json add `"test:doors": "node scripts/doors-test.mjs"` and insert it into `test` after `test:physics`.

## Acceptance
- `npm test` runs the doors tests and all four PASS.

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
