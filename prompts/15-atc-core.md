---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Atc.ts scripts/atc-test.mjs package.json
read: src/game/Physics.ts scripts/physics-test.mjs
ctx: 32k
title: TTC 15: ATC/CBTC-style speed supervision core with tests
---
# TTC 15 · ATC/CBTC-style speed supervision core with tests

Depends on: 14. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/Atc.ts scripts/atc-test.mjs package.json`.

## Current behaviour
There is no train protection.

## Target
A pure `Atc` class that supervises the civil limits with a braking curve, a warning and a latched penalty brake. It is simplified: no other trains.

## Steps
1. Create `src/game/Atc.ts`: `export class Atc { constructor(sections: {s0:number;s1:number;limitKmh:number}[], decel = 0.8 /* ESTIMATE */); update(s, v, consistLen = 138): AtcState }`.
   `AtcState = { limitKmh, targetKmh, targetS, ceilingKmh, warn, penalty }`.
   - limit = lowest limit under `[s - consistLen, s]`;
   - target = the next lower limit within the braking distance + 200 m;
   - ceiling = `sqrt(vt² + 2·decel·d)`;
   - warn if v > ceiling + 3 km/h;
   - penalty latches at v > ceiling + 8 km/h. It releases only when v == 0 and `releaseRequested` (a public flag) is true.
2. Create `scripts/atc-test.mjs`, using the esbuild loader pattern from physics-test.mjs. Asserts:
   - `limit is lowest under the consist`;
   - `ceiling falls toward a lower section`;
   - `warn before penalty`;
   - `penalty latches and releases only at standstill`.
3. package.json: add `"test:atc": "node scripts/atc-test.mjs"` and insert it into `test` after `test:physics`.

## Acceptance
- `npm test` passes, with the four ATC tests PASS.

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
