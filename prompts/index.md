# Index: TTC Sim Game Coder prompts

Run order is file order: 01–26 is the backlog and 90–99 is polish (run last). Each step builds on the previous ones on the branch `gamecoder/ttc-sim-backlog`. If a step fails, the queue rolls it back, and later steps that depend on it will probably fail too: fix it and requeue from there.

| # | Title | Depends on | File | Queue file | Done |
|---|---|---|---|---|---|
| 01 | Move tunnel depth parameters into a cited data file | none | `01-structure-depths-file.md` | `01-ttc-01-structure-depths-file.md` | ☐ |
| 02 | Fold the documented depths from depth-findings into the structure file | 01 | `02-apply-documented-depths.md` | `01-ttc-02-apply-documented-depths.md` | ☐ |
| 03 | Keep the tunnel roof under ground at Hogg’s Hollow and the Nordheimer Ravine | 01 | `03-valley-roof-cover.md` | `01-ttc-03-valley-roof-cover.md` | ☐ |
| 04 | Correct Line 1 tunnel types and depths from depth-findings | 01, 03 | `04-tunnel-types-bake.md` | `01-ttc-04-tunnel-types-bake.md` | ☐ |
| 05 | Tests for the corrected tunnel types | 04 | `05-tunnel-types-tests.md` | `01-ttc-05-tunnel-types-tests.md` | ☐ |
| 06 | Render each bored section with its own diameter | 04 | `06-bore-diameter-render.md` | `01-ttc-06-bore-diameter-render.md` | ☐ |
| 07 | Platform grade clamp (documented 0.3%) instead of dead-level pins | 01 | `07-platform-grade-clamp.md` | `01-ttc-07-platform-grade-clamp.md` | ☐ |
| 08 | Fast design-only terrain rebake (no HRDEM refetch) | 01 | `08-terrain-design-only-rebake.md` | `01-ttc-08-terrain-design-only-rebake.md` | ☐ |
| 09 | Fill station neighbourhood and levels from the cached Wikipedia HTML | none | `09-station-wiki-parse.md` | `01-ttc-09-station-wiki-parse.md` | ☐ |
| 10 | Synthesised traction motor and rolling sound module | none | `10-audio-engine.md` | `01-ttc-10-audio-engine.md` | ☐ |
| 11 | Wire the sound into the game (M to mute) | 10 | `11-audio-hook.md` | `01-ttc-11-audio-hook.md` | ☐ |
| 12 | Door cycle state machine (ION LRT timing) with tests | none | `12-door-cycle-core.md` | `01-ttc-12-door-cycle-core.md` | ☐ |
| 13 | Doors in the game: O/K keys, original TTC-style chime, traction interlock | 11, 12 | `13-door-hook-chime.md` | `01-ttc-13-door-hook-chime.md` | ☐ |
| 14 | Bake civil speed limits (generated, ESTIMATE rules) | none | `14-speed-limit-bake.md` | `01-ttc-14-speed-limit-bake.md` | ☐ |
| 15 | ATC/CBTC-style speed supervision core with tests | 14 | `15-atc-core.md` | `01-ttc-15-atc-core.md` | ☐ |
| 16 | ATC in the game: HUD target speed, penalty brake | 15 | `16-atc-hook-hud.md` | `01-ttc-16-atc-hook-hud.md` | ☐ |
| 17 | Lineside speed boards (generic design) | 16 | `17-speed-boards.md` | `01-ttc-17-speed-boards.md` | ☐ |
| 18 | Traction substations from OSM (600 V DC third rail), ESTIMATE gaps | none | `18-substations-bake.md` | `01-ttc-18-substations-bake.md` | ☐ |
| 19 | Traction power model: 600 V sag, aux load, regen blend (pure, tested) | 18 | `19-traction-power-model.md` | `01-ttc-19-traction-power-model.md` | ☐ |
| 20 | Use line voltage in physics and show a power panel | 19 | `20-traction-power-hud.md` | `01-ttc-20-traction-power-hud.md` | ☐ |
| 21 | Persistent LRU tile cache in IndexedDB (ION LRT pattern) | none | `21-tile-cache-core.md` | `01-ttc-21-tile-cache-core.md` | ☐ |
| 22 | Load uncached OIWMS hi-res tiles live through the tile cache | 21 | `22-oiwms-live-tiles.md` | `01-ttc-22-oiwms-live-tiles.md` | ☐ |
| 23 | Blender script for an original TR-style car model | none | `23-blender-tr-script.md` | `01-ttc-23-blender-tr-script.md` | ☐ |
| 24 | Use the TR GLB models with a box fallback | 23 | `24-load-tr-model.md` | `01-ttc-24-load-tr-model.md` | ☐ |
| 25 | Full Xbox controller mapping (pure, tested) | none | `25-gamepad-map.md` | `01-ttc-25-gamepad-map.md` | ☐ |
| 26 | Wire the gamepad door and mute buttons, update the help text and README controls | 13, 25 | `26-controls-wiring-readme.md` | `01-ttc-26-controls-wiring-readme.md` | ☐ |
| 90 | Polish: HUD layout and readability | all of 01-26 | `90-polish-hud-layout.md` | `01-ttc-90-polish-hud-layout.md` | ☐ |
| 91 | Polish: cab view and lighting | 90 | `91-polish-cab-view-lighting.md` | `01-ttc-91-polish-cab-view-lighting.md` | ☐ |
| 92 | Polish: platform detail (yellow edge strip, tactile edge, signs, lighting) | 90 | `92-polish-platform-detail.md` | `01-ttc-92-polish-platform-detail.md` | ☐ |
| 93 | Polish: tunnel detail (lighting, cable trays, signals) | 92 | `93-polish-tunnel-detail.md` | `01-ttc-93-polish-tunnel-detail.md` | ☐ |
| 94 | Polish: terrain/scenery seams and LOD pop | 22 | `94-polish-terrain-seams-lod.md` | `01-ttc-94-polish-terrain-seams-lod.md` | ☐ |
| 95 | Polish: performance pass (draw calls, frame time on the RX 580) | 92, 93, 94 | `95-polish-performance.md` | `01-ttc-95-polish-performance.md` | ☐ |
| 96 | Polish: physics feel against documented TR figures | all of 01-26 | `96-polish-physics-feel.md` | `01-ttc-96-polish-physics-feel.md` | ☐ |
| 97 | Polish: audio mix levels | 13 | `97-polish-audio-mix.md` | `01-ttc-97-polish-audio-mix.md` | ☐ |
| 98 | Polish: gamepad feel and dead zones | 25 | `98-polish-gamepad-feel.md` | `01-ttc-98-polish-gamepad-feel.md` | ☐ |
| 99 | Polish: final full regression and README refresh | all | `99-polish-regression-readme.md` | `01-ttc-99-polish-regression-readme.md` | ☐ |
