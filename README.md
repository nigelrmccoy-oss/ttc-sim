# TTC Sim (unofficial)

A browser-based Toronto subway driving game. First playable piece: **Line 1 Yonge-University**,
driven from Vaughan Metropolitan Centre via Union to Finch in a placeholder TR-style 6-car train.

> Unofficial fan project. Not affiliated with, endorsed by, or connected to the Toronto Transit
> Commission. No TTC logos, trademarks, or recorded sounds are used; the train livery is a
> colour-only tribute.

Stack: Vite + TypeScript + Three.js (same layout as [ion-LRT](https://github.com/nigelrmccoy-oss/ion-LRT)).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
```

## Controls

| Input | Action |
|---|---|
| W / ↑ (hold) | move controller toward full power |
| S / ↓ (hold) | move controller toward full service brake |
| X | coast (controller to zero) |
| Space | toggle emergency brake |
| C | toggle cab / chase camera |
| Gamepad RT / LT | power / brake (stub, standard mapping; overrides keyboard while pressed) |

The HUD shows speed, the line speed limit, controller position, acceleration, distance to the
next station's stop mark (far end of the platform), and chainage along the line.

## Data

`public/data/line1.json` is baked by `scripts/bake-line1.mjs` from OpenStreetMap
(© OpenStreetMap contributors, ODbL 1.0) via the Overpass API:

- Route relation [102388](https://www.openstreetmap.org/relation/102388), "Line 1 Yonge-University
  (Vaughan Metropolitan Centre → Finch)": 31 track ways chained into one 38.72 km polyline.
- 38 stop positions and their platform ways (PTv2 members), projected to chainage.
- Raw Overpass response cached in `scripts/raw/line1-relation-102388.json`
  (fetched 2026-11-21; the exact timestamp is stored in `line1.json` → `source.fetched`).
  Re-fetch with `REFETCH=1 npm run bake:line1`.

Known data limits: only one running track (the VMC → Finch direction) is mapped; the line is
flat (no elevation, tunnels, or viaducts yet); `platformSideEstimate` is just which side of that
track the OSM platform polygon lies, so island platforms are not distinguished; the end-of-line
platforms at VMC and Finch are truncated where the mapped track ends.

## Estimates

Every vehicle, physics, and geometry constant that is not from OSM is a placeholder and is
labelled `ESTIMATE` in the code. Current values:

| Value | Estimate | Where |
|---|---|---|
| Consist length (6 × ~23 m) | 138 m | `src/game/Physics.ts` |
| Mass | 240 t | `Physics.ts` |
| Line speed limit | 80 km/h | `Physics.ts` |
| Vehicle top speed / governor band | 88 km/h / 4 km/h | `Physics.ts` |
| Max traction accel, base speed | 1.1 m/s², 36 km/h | `Physics.ts` |
| Full service / emergency brake | 1.3 / 1.6 m/s² | `Physics.ts` |
| Jerk limit (service / emergency) | 0.8 / 3.0 m/s³ | `Physics.ts` |
| Davis resistance A, B, C | 0.012, 0.0004, 0.00006 | `Physics.ts` |
| Body width / roof / floor height | 3.1 / 3.65 / 1.05 m | `src/game/Train.ts` |
| Platform edge offset / width / height | 1.6 / 4.5 / 1.05 m | `src/game/World.ts` |
| Sleeper spacing | 0.75 m | `World.ts` |
| Driver eye height | 2.6 m | `src/game/Game.ts` |
| Good-stop tolerance | ±3 m | `Game.ts` |

Track gauge is the Toronto subway's 1495 mm.

## Tests

```bash
npm test             # physics tests, build, headless smoke test
npm run test:physics # physics + data checks only (esbuild, no browser)
npm run test:smoke   # needs a build; Playwright headless Chromium with SwiftShader WebGL
```

The smoke test serves `dist/` with `vite preview` on a free port, checks for console errors, a
sized canvas, a non-blank frame, a working HUD, and that holding W moves the train, then shuts
the server down. Screenshots go to `logs/` (git-ignored).

## Layout

```
scripts/bake-line1.mjs    OSM → public/data/line1.json
scripts/physics-test.mjs  headless physics/data tests
scripts/smoke-test.mjs    headless browser smoke test
src/main.ts               boot: load line data, start game
src/game/Physics.ts       traction/braking with jerk limit
src/game/Track.ts         polyline + chainage lookups
src/game/World.ts         trackbed, rails, sleepers, platforms, signs
src/game/Train.ts         placeholder box-geometry consist
src/game/Input.ts         keyboard + gamepad stub
src/game/Game.ts          loop, cameras, HUD
```
