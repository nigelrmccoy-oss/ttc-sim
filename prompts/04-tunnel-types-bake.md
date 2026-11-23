---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: scripts/bake-profile.mjs data/structure_depths.json
read: docs/depth-findings.md
ctx: 32k
title: TTC 04: Correct Line 1 tunnel types and depths from depth-findings
---
# TTC 04 · Correct Line 1 tunnel types and depths from depth-findings

Depends on: 01, 03. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `scripts/bake-profile.mjs data/structure_depths.json`.

## Current behaviour
`construction(s, cls)` in `bake-profile.mjs` (~line 84) returns:
- 'bored (TYSSE twin)' and 'box (TYSSE station)' north of Sheppard West;
- 'bored (University)' between Museum and Osgoode;
- 'box (Yonge 1954)' from Union to Eglinton;
- otherwise plain 'box'.
`railDepth(c)` maps each label to a STRUCTURE depth. Station chainages come from `line.stations` (`platformStartM`/`platformEndM`); use the helpers `pS(name)` and `pE(name)`.
docs/depth-findings.md documents:
(a) Davenport Rd → Russell Hill Dr / Nordheimer Ravine (under Casa Loma) was built **in tunnel**, not cut-and-cover. Davenport Rd ≈ 18 180 m, Russell Hill ≈ 17 410 m (ESTIMATE chainages projected from map coordinates).
(b) Eglinton → Sheppard is **twin tunnels, 4.9 m (16 ft) diameter**. Manual shields ran Eglinton–Lawrence and York Mills–Sheppard, and TBMs ran Lawrence–York Mills. Cut-and-cover was used north of Eglinton, at Lawrence (with a scissors crossover to the south), through Hogg’s Hollow / York Mills, and for 1249 ft (381 m) before Sheppard.
(c) Sheppard → Finch is cut-and-cover (box).
(d) Cedarvale / Forest Hill ravines are shallow cut-and-cover.
(e) Lawrence station is 18.3 m below the street (TTC via blogTO 2025).

## Target
The construction labels match the documents, and Lawrence sits deep. Every new number is labelled documented or ESTIMATE in `data/structure_depths.json`.

## Steps
1. Add these entries to `data/structure_depths.json`:
   - `northYongeBoreDiameter`: 4.9 m, documented, Wikipedia "North Yonge subway extension" (https://en.wikipedia.org/wiki/North_Yonge_subway_extension). Note: it is not stated whether this is the internal diameter.
   - `northYongeBoredRailDepth`: 14 m, estimate.
   - `spadinaMinedRailDepth`: 16 m, estimate (tunnel under Casa Loma, no depth found).
   - `lawrenceRailDepth`: 18.3 m, documented. Basis: station depth 18.3 m below the street (blogTO 2025, quoting the TTC), applied to the rail as an ESTIMATE interpretation.
   - `cedarvaleBoxRailDepth`: 7 m, estimate (shallow cut-and-cover through the ravines).
2. Rewrite `construction()` so that, in this order:
   - `s` in [17410, 18180] → 'bored (Spadina, under Casa Loma)';
   - `s` between pE('Cedarvale') and 17410 → 'box (Cedarvale)';
   - stations and these cut-and-cover zones → 'box':
     - pE('Eglinton') .. pE('Eglinton') + 300 (ESTIMATE);
     - pS('Lawrence') - 250 .. pE('Lawrence') + 40;
     - 34300 .. pE('York Mills') + 150 (Hogg’s Hollow);
     - pS('Sheppard-Yonge') - 381 .. pE('Sheppard-Yonge');
   - the rest of pE('Eglinton') .. pS('Sheppard-Yonge') → 'bored (North Yonge)';
   - after pE('Sheppard-Yonge') → 'box'.
   Keep the existing TYSSE, University and Yonge-1954 rules for the other sections.
3. Extend `railDepth()` with the new labels. For samples within ±40 m of the Lawrence platform, use `lawrenceRailDepth`.
4. Leave the 1.2 m West Don minimum cover from prompt 03 in force.

## Acceptance
- `npm test` passes, including `max grade within the documented 4%`, `platforms are level` and prompt 03's `no tunnel roof above ground outside covered ways`.
- The bake log line `lengthsByConstructionM` shows 'bored (North Yonge)' at more than 4000 m and 'bored (Spadina, under Casa Loma)' at about 770 m.

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
