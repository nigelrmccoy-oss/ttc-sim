# TTC Sim → Game Coder / Devstral prompt pack

Bite-sized prompts for the TTC Sim backlog. **Each prompt is one task touching 1–3 files**, and is sized for a local model with 32k context.
They follow the same layout as `~/Desktop/hydro-lines-devstral-prompts/`: a YAML header in the Game Coder queue format (`repo`, `branch`, `files`, `read`, `ctx`, `title`), then the task.

## How to use

1. **By hand in Game Coder:** open a fresh session per prompt. `/add` the `files:`, `/read` the `read:`, and paste the body. Run the prompt's **Test**. If it fails, paste the failing output back once. If it still fails, `git checkout -- .` and retry in a fresh session.
2. **Through the queue:** copy a file into `/mnt/240G/ai/coder/queue/pending/` with a sortable name, e.g. `40-ttc-001-structure-depths-file.md`.
   - The queue needs a `ttc-sim` entry in `/mnt/240G/ai/coder/games.json` for its lint and test settings. Game Coder owns that file, so ask Game Coder to add it.
   - The queue refuses uncommitted repos and `main`, so the prompts use the branch `gamecoder/ttc-sim-backlog`.
3. Once a prompt is accepted, commit locally: `git add <files> && git commit -m "TTC NN: <title>"`. **Never push**; Nigel reviews first.
4. Tick the row in `index.md`.

**Order:** 01 → 02 (02 waits for `docs/depth-findings.md`, which a person or the TTC Sim bot fills from the documents in `docs/sources.md`), 03, 04, 05 → 06, 07 → 08 → 09, 10 → 11, 12. 03, 04, 05, 07, 10 and 12 do not depend on each other.

## Rules (also repeated in every prompt)
- Edit only the files listed in `files:` above. Read the `read:` files for context; do not change them.
- Stack is Vite + TypeScript + Three.js. Keep `npx tsc --noEmit` clean.
- **Keys never get committed.** No API keys, tokens or passwords in code, data, logs or commit messages. None of these tasks need one.
- **Heavy runs go under the shared lock:** `flock /tmp/nigian-heavy-tests.lock <cmd>` for `npm test`, `npm run build`, bake scripts, Blender and anything that starts a browser.
- Headless only. Never open the game or a browser window on Nigel's screen. Kill any server you start.
- Trim output: send full logs to `logs/<name>.log` and look at them with `tail -n 40` or `grep`.
- Every number that is not from a cited source is labelled `ESTIMATE` in a comment or a `basis` field. No TTC logos, trademarks or copied sounds.
- Commit locally on the branch only. **Never push.** Nigel reviews first.

## Project facts

- Repo `/home/nig/ttc-sim`, base commit `7db5caf`, public at github.com/nigelrmccoy-oss/ttc-sim.
- Run the game with `scripts/launch.sh` (it builds if needed, then `vite preview` on 127.0.0.1:5185). For headless checks use `PLAY_NO_BROWSER=1`.
- Tests:
  - `npm test` = `scripts/physics-test.mjs` (physics, profile, station data) → `tsc && vite build` → `scripts/smoke-test.mjs` (headless Playwright, SwiftShader, about 3 min).
  - `SMOKE_GPU=1` uses the RX 580 headless.
- Data (`public/data/`):
  - `line1.json` holds the track polyline and stations.
  - `line1_profile.json` holds 5 m arrays `ground`, `rail`, `cls`, `construction`, plus `portals` and `structure`.
  - `line1_stations.json` holds Wikipedia station facts with sources.
  - `corridor.json` holds the OSM buildings, trees and roads.
  - `terrain/` holds the HRDEM tiles.
- Code (`src/game/`):
  - `Track.ts`: chainage `s` in metres from Vaughan Metropolitan Centre; `railAt`, `gradeAt`, `classAt`, `constructionAt`.
  - `Physics.ts`: `TrainPhysics`; lever −1..1, with grade.
  - `Input.ts`, `Game.ts` (main loop, HUD, `debug`), `World.ts` (500 m chunks, tunnels, stations, signs), `Train.ts`, `Terrain.ts`, `Scenery.ts`.
- `window.__ttcSim` (the Game, with `.debug`) and `window.__ttcSimTeleport(s)` are used by the smoke test. **Don't remove or rename them.**
- Every estimate is labelled ESTIMATE. All sources are in `docs/sources.md`.
