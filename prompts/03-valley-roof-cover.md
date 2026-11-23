---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: scripts/bake-profile.mjs scripts/physics-test.mjs
read: docs/depth-findings.md
ctx: 32k
title: TTC 03: Keep the tunnel roof under ground at Hogg’s Hollow and the Nordheimer Ravine
---
# TTC 03 · Keep the tunnel roof under ground at Hogg’s Hollow and the Nordheimer Ravine

Depends on: 01. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `scripts/bake-profile.mjs scripts/physics-test.mjs`.

## Current behaviour
The box roof (`rail + boxHeightAboveRail`, 5.0 m, ESTIMATE) sits above `ground` on these runs (as baked at commit 0444c1e):
| km | samples | worst | place |
|---|---|---|---|
| 33.77-34.38 | 116 | 6.8 m | descent into Hogg’s Hollow, south of York Mills (Mill St ≈ 34.36 km, West Don ≈ 34.64 km; ESTIMATE positions) |
| 17.37-17.54 | 35 | 2.7 m | Nordheimer Ravine, between St Clair West (17.10) and Dupont (18.40) |
| 27.23-27.28 | 12 | 2.8 m | small dip south of Summerhill |
| 10.09-10.18 | 19 | 6.3 m | already `covered way` (rendered as a berm); leave it |
**Documented:** at Hogg’s Hollow "the top of the tunnel sits 1.2 metres (4 ft) below the riverbed" (Wikipedia, North Yonge subway extension; depth-findings Table B).

## Target
No running-tunnel sample has its roof above ground. The West Don crossing keeps at least 1.2 m of cover (documented); other crossings keep 1.0 m (ESTIMATE).

## Steps
1. In `bake-profile.mjs`, add
   `const VALLEY_CROSSINGS = [ { name, s0, s1, treatment: 'lower' | 'covered', minCoverM, basis } ]` with:
   - Hogg’s Hollow / West Don: s0 33700, s1 34750, 'lower', minCoverM 1.2, basis "documented: tunnel top 1.2 m below the West Don riverbed (Wikipedia North Yonge subway extension)".
   - Nordheimer Ravine: 17300-17600, 'lower', 1.0, "ESTIMATE".
   - Summerhill dip: 27200-27300, 'lower', 1.0, "ESTIMATE".
2. Before the final grade-limit pass, for samples in each `lower` range, cap the rail:
   `rail[i] = Math.min(rail[i], ground[i] - STRUCTURE.boxHeightAboveRail.value - minCoverM)`.
   Then let the existing forward/backward limiter and vertical-curve fit run. Platforms keep their pinned level.
3. After the final pass, if any sample in a crossing still has its roof above ground, set `cons[i] = 'covered way'` for those samples only.
   Log the worst remaining value per crossing with `console.log`.
4. In `physics-test.mjs`, add:
   - `assert('no tunnel roof above ground outside covered ways', …)`: for every i with `cls[i]==='tunnel'` and `construction[i] !== 'covered way'`, require `rail[i] + 5.0 <= ground[i] + 0.1`. Print the count and worst km.
   - `assert('West Don crossing keeps 1.2 m cover', …)`: over s 34600-34700, `ground - rail - 5.0 >= 1.2 - 0.05`.

## Acceptance
- Both new tests PASS.
- These still PASS: `max grade within the documented 4%`, `no sudden steps: every 5 m step within the max grade`, `grade changes gradually (vertical curves)`, `platforms are level`, `rail is below ground at portals`.

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
