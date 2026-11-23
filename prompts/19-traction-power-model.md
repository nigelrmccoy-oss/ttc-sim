---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/TractionPower.ts scripts/power-test.mjs package.json
read: src/game/Physics.ts
ctx: 32k
title: TTC 19: Traction power model: 600 V sag, aux load, regen blend (pure, tested)
---
# TTC 19 · Traction power model: 600 V sag, aux load, regen blend (pure, tested)

Depends on: 18. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/TractionPower.ts scripts/power-test.mjs package.json`.

## Current behaviour
Physics assumes full traction voltage everywhere.

## Target
A pure model after ION LRT's `TractionPower.ts` (read-only reference: /home/nig/ion-LRT/src/game/TractionPower.ts), adapted to 600 V DC third rail.

## Steps
1. Create `src/game/TractionPower.ts` with:
   - `UN_V = 600`;
   - `UMIN_V = 400` (ESTIMATE);
   - `UMAX_V = 720` (ESTIMATE);
   - `LOOP_OHM_PER_KM = 0.15` (ESTIMATE, from ION's catenary figure; third rail is lower resistance, so note "likely conservative");
   - `AUX_LOAD_KW = 6 * 25` (ESTIMATE: 6 cars × 25 kW HVAC/aux);
   - `MIN_FEED_DISTANCE_M = 50`.
2. Functions:
   - `equivalentResistanceOhm(s, sites)`: the two nearest sites in parallel, R = ohm/km · distance;
   - `samplePower({ s, tractionW, sites })` → `{ volts, amps, lineKw, band: 'low' | 'nominal' | 'regen', tractionScale }`;
   - V = UN − I·R, with I = P / V solved by 3 fixed-point iterations;
   - `tractionScale` = min(1, V / UN);
   - regen (P < 0) is accepted up to `UMAX_V`; the excess is blended to friction braking, reported as `regenShare`.
3. Create `scripts/power-test.mjs` (esbuild loader). Asserts:
   - `voltage sags with distance from a substation`;
   - `no divide-by-zero on top of a site`;
   - `regen limited at UMAX`;
   - `aux load draws power at standstill`.
4. package.json: `test:power` in the test chain.

## Acceptance
- `npm test` passes, with the four power tests PASS.

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
