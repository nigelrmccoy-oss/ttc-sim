---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: data/structure_depths.json docs/sources.md
read: docs/depth-findings.md
ctx: 32k
title: TTC 02: Fold the documented depths from depth-findings into the structure file
---
# TTC 02 · Fold the documented depths from depth-findings into the structure file

Depends on: 01. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `data/structure_depths.json docs/sources.md`.

## Current behaviour
`data/structure_depths.json` (from prompt 01) still marks `tysseStationRailDepth` (17) as an ESTIMATE.
`docs/depth-findings.md` Table A has two documented rows: `tysseStationRailDepth` = 20 (estimate-in-documented-range) and `boreInternalDiameter` = 5.4 (documented).
Its "Keys with no documented value" table says the rest stay estimates.

## Target
The structure file carries the documented values and citations; `docs/sources.md` lists the newly used documents.

## Steps
1. Set `entries.tysseStationRailDepth` to: `value` 20, `status` "estimate-in-documented-range", `basis` = the quote from Table A, and `source` = blogTO 2025 (title and url from Table A). Add `"source2"` for the RCCAO 2020 report.
2. Set `entries.boreInternalDiameter`: `status` "documented", `source` = YSE Conceptual Design Report 2012, §3.3.1, p. 5 (url from Table A).
3. Add `"note"` fields, without changing the values:
   - `tysseBoredRailDepth`: "Sources conflict: EA 2005 cover 9-12 m vs TBM magazine invert 20-30 m (docs/depth-findings.md)".
   - `maxGradePct`: "TTC design criteria for new lines: max 3.5% main line, 0.3% in stations (VNSL 2007)".
4. In `docs/sources.md`, add rows to the sources table for:
   - the YSE Conceptual Design Report 2012;
   - the TYSSE EA Appendix P (2005);
   - the VNSL Response to Conditions (2007);
   - blogTO 2025;
   - RCCAO 2020;
   - TTC Coupler "45 years ago in 1978";
   - Transit Toronto 5105 and 5106;
   - Wikipedia "North Yonge subway extension".
   Then remove the matching items from "Found, not yet used".

## Acceptance
- `npm test` passes. The test `structure file: documented entries cite a URL` passes for `boreInternalDiameter`.
- The test `max grade within the documented 4%` still passes with the deeper TYSSE stations.

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
