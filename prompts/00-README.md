# TTC Sim → Game Coder / Devstral prompt pack

These are small, self-contained prompts in the Game Coder queue format: front matter (`repo`, `branch`, `files`, `read`, `ctx`, `title`) followed by the task. Each one touches 1–3 files (at most 4 small ones) and fits Devstral's 32k context.
**Source of truth:** `scripts/prompts/gen_prompts.py`. Edit there and run `python3 scripts/prompts/gen_prompts.py`, then commit.

## How the queue runs them
- Queue copies live in `/mnt/240G/ai/coder/queue/pending/` as `01-ttc-NN-<slug>.md`. That name sorts after Hydro-Lines (`00-zz-hl-*`) and before Nig Drives (`v160-*`, `v170-*`). The daemon runs pending files one at a time, in plain filename order.
- For each one, the daemon switches `/home/nig/ttc-sim` to `gamecoder/ttc-sim-backlog` (it creates the branch from the current HEAD the first time). Aider edits only `files:`. Then the gates run: tsc lint → `npm test` (games.json runs `env -u PLAYWRIGHT_BROWSERS_PATH flock /tmp/nigian-heavy-tests.lock npm test`) → Code Checker. A pass is committed locally on the branch and **never pushed**. Finally the daemon switches back to `main`.
- The daemon refuses to start a step if the repo has uncommitted tracked changes, so keep `main` clean while the queue runs.
- Aider cannot run shell commands. Generated data (`line1_profile.json`, `line1_speed.json`, `line1_substations.json`) is git-ignored and rebuilt by `npm run bake:derived`, which runs before dev, build and test. Prompts therefore never list big generated JSON in `files:`.
- Manual follow-ups (Blender GLBs, the network rebake for the terrain cache) are marked in the prompts and need a person or the TTC Sim bot.

## By hand in Game Coder
Use a fresh session per prompt. `/add` the files, `/read` the reads, paste the body, run `flock /tmp/nigian-heavy-tests.lock npm test`. Commit locally on `gamecoder/ttc-sim-backlog`; Nigel reviews and merges.

## Order and dependencies
See `index.md`:
- profile/tunnels 01–09;
- audio and doors 10–13;
- speed limits and ATC 14–17;
- traction power 18–20;
- imagery cache 21–22;
- train model and input 23–26;
- polish 90–99.

## Rules
- Edit **only** the files in `files:`. Any other edit fails the step. `read:` files are context only.
- You cannot run shell commands. The queue runs the gate itself: `npx tsc --noEmit`, then `flock /tmp/nigian-heavy-tests.lock npm test`, then the Code Checker.
  `npm test` = `test:data` (re-bakes `public/data/line1_profile.json` from `scripts/bake-profile.mjs`; it is generated and git-ignored) → `test:physics` → `build` → `test:smoke` (headless). Nigel's manual run is `flock /tmp/nigian-heavy-tests.lock npm test` from `/home/nig/ttc-sim`.
- **Never commit keys**: no API keys, tokens or passwords in code, data, comments or logs. Nothing here needs one.
- **No TTC logos, wordmarks, roundels or trademarks, and no copied sounds or images.** Original synthesis and generic designs only.
- **Label estimates**: any number not taken from a cited source carries `ESTIMATE` in a comment or a `basis` field. Never invent a citation.
- Headless only; never open a window on Nigel's screen. Keep `window.__ttcSim` (with `.debug`) and `window.__ttcSimTeleport(s)` working, because the smoke test uses them.
- Chainage `s` is metres from Vaughan Metropolitan Centre (s = 0) to Finch (about 38 721 m).

## Project facts
- Vite + TypeScript + Three.js.
- `src/game/`:
  - `Track.ts`: chainage, `railAt`, `gradeAt`, `classAt`, `constructionAt`;
  - `Physics.ts`;
  - `Input.ts`;
  - `Game.ts`: loop, HUD, `debug`;
  - `World.ts`: 500 m chunks, tunnels, stations, signs;
  - `Train.ts`, `Terrain.ts`, `Scenery.ts`.
- Data and inputs:
  - `public/data/`: `line1.json`, `line1_stations.json`, `corridor.json` and `terrain/` are committed; the profile, speed and substations files are generated;
  - `data/structure_depths.json` (from prompt 01);
  - `scripts/raw/`: committed OSM and HRDEM samples (git-ignored caches too).
- Sources: `docs/sources.md` and `docs/depth-findings.md`. ION LRT patterns are in `docs/shared-with-ion-lrt.md` (read ION LRT for reference only; never edit it).
