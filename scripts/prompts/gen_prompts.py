#!/usr/bin/env python3
"""Generates prompts/*.md (Game Coder queue format). Edit here, then run: python3 scripts/prompts/gen_prompts.py"""
import os, textwrap, glob
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'prompts')
REPO = '/home/nig/ttc-sim'; BR = 'gamecoder/ttc-sim-backlog'
TEST = 'flock /tmp/nigian-heavy-tests.lock npm test'
RULES = f"""## Rules
- Edit **only** the files in `files:`. Any other edit fails the step. `read:` files are context only.
- You cannot run shell commands. The queue runs the gate itself: `npx tsc --noEmit`, then `{TEST}`, then the Code Checker.
  `npm test` = `test:data` (re-bakes `public/data/line1_profile.json` from `scripts/bake-profile.mjs`; it is generated and git-ignored) → `test:physics` → `build` → `test:smoke` (headless). Nigel's manual run is `{TEST}` from `{REPO}`.
- **Never commit keys**: no API keys, tokens or passwords in code, data, comments or logs. Nothing here needs one.
- **No TTC logos, wordmarks, roundels or trademarks, and no copied sounds or images.** Original synthesis and generic designs only.
- **Label estimates**: any number not taken from a cited source carries `ESTIMATE` in a comment or a `basis` field. Never invent a citation.
- Headless only; never open a window on Nigel's screen. Keep `window.__ttcSim` (with `.debug`) and `window.__ttcSimTeleport(s)` working, because the smoke test uses them.
- Chainage `s` is metres from Vaughan Metropolitan Centre (s = 0) to Finch (about 38 721 m).
"""
P = []
def add(num, slug, title, files, read, depends, current, target, steps, accept, ctx='32k', manual=None):
    P.append(dict(num=num, slug=slug, title=title, files=files, read=read, depends=depends, current=current, target=target,
                  steps=steps, accept=accept, ctx=ctx, manual=manual))

def d(s):
    """Dedent a block whose first line starts right after the opening quotes."""
    first, _, rest = s.strip('\n').partition('\n')
    return (first.strip() + ('\n' + textwrap.dedent(rest) if rest else '')).strip()

# ---------------------------------------------------------------- profile / tunnels
add('01', 'structure-depths-file', 'Move tunnel depth parameters into a cited data file',
    'scripts/bake-profile.mjs data/structure_depths.json scripts/physics-test.mjs', 'docs/sources.md', 'none',
    d("""`scripts/bake-profile.mjs` (lines ~24-36) has an inline `const STRUCTURE = { key: { value, basis } }` with 11 keys:
    maxGradePct, tysseBoredRailDepth, tysseStationRailDepth, boreInternalDiameter, yonge1954BoxRailDepth, universityBoredRailDepth,
    otherBoxRailDepth, boxHeightAboveRail, portalCover, rosedaleCutDepth, verticalCurveRadius. The rest of the script reads `STRUCTURE.<key>.value`.
    The baked profile copies `STRUCTURE` into its `structure` field."""),
    'The values live in `data/structure_depths.json` with status and source per entry; the bake reads that file; the output is unchanged.',
    d("""1. Create `data/structure_depths.json` as
       `{ "note": "Line 1 structure parameters. status: documented | estimate | estimate-in-documented-range", "entries": { "<key>": { "value": <number>, "unit": "m" | "%", "status": "...", "basis": "<copy of today's basis text>", "source": { "title": "...", "url": "..." } | null } } }`
       for all 11 keys with today's values. Take the source titles and URLs from `docs/sources.md`. Use `null` when the basis says ESTIMATE with no source.
    2. In `bake-profile.mjs`, replace the inline literal with
       `const STRUCTURE = JSON.parse(fs.readFileSync(path.join(root, 'data/structure_depths.json'), 'utf8')).entries;`
       Keep every `STRUCTURE.<key>.value` use unchanged.
    3. In `scripts/physics-test.mjs`, under `// ---------- Profile ----------`, add these tests:
       - `assert('structure file: every entry has status and basis', …)`
       - `assert('structure file: documented entries cite a URL', …)`: every `status === 'documented'` entry has a non-empty `source.url`.
       - `assert('profile.structure matches data/structure_depths.json', …)`: compare the `value`s key by key."""),
    d("""- The three new tests PASS. All existing profile tests still PASS, including `max grade within the documented 4%`, `platforms are level` and `rail is below ground at portals`.
    - The baked `rail` array is identical to before. Same values give the same profile."""))

add('02', 'apply-documented-depths', 'Fold the documented depths from depth-findings into the structure file',
    'data/structure_depths.json docs/sources.md', 'docs/depth-findings.md', '01',
    d("""`data/structure_depths.json` (from prompt 01) still marks `tysseStationRailDepth` (17) as an ESTIMATE.
    `docs/depth-findings.md` Table A has two documented rows: `tysseStationRailDepth` = 20 (estimate-in-documented-range) and `boreInternalDiameter` = 5.4 (documented).
    Its "Keys with no documented value" table says the rest stay estimates."""),
    'The structure file carries the documented values and citations; `docs/sources.md` lists the newly used documents.',
    d("""1. Set `entries.tysseStationRailDepth` to: `value` 20, `status` "estimate-in-documented-range", `basis` = the quote from Table A, and `source` = blogTO 2025 (title and url from Table A). Add `"source2"` for the RCCAO 2020 report.
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
       Then remove the matching items from "Found, not yet used"."""),
    d("""- `npm test` passes. The test `structure file: documented entries cite a URL` passes for `boreInternalDiameter`.
    - The test `max grade within the documented 4%` still passes with the deeper TYSSE stations."""))

add('03', 'valley-roof-cover', 'Keep the tunnel roof under ground at Hogg’s Hollow and the Nordheimer Ravine',
    'scripts/bake-profile.mjs scripts/physics-test.mjs', 'docs/depth-findings.md', '01',
    d("""The box roof (`rail + boxHeightAboveRail`, 5.0 m, ESTIMATE) sits above `ground` on these runs (as baked at commit 0444c1e):
    | km | samples | worst | place |
    |---|---|---|---|
    | 33.77-34.38 | 116 | 6.8 m | descent into Hogg’s Hollow, south of York Mills (Mill St ≈ 34.36 km, West Don ≈ 34.64 km; ESTIMATE positions) |
    | 17.37-17.54 | 35 | 2.7 m | Nordheimer Ravine, between St Clair West (17.10) and Dupont (18.40) |
    | 27.23-27.28 | 12 | 2.8 m | small dip south of Summerhill |
    | 10.09-10.18 | 19 | 6.3 m | already `covered way` (rendered as a berm); leave it |
    **Documented:** at Hogg’s Hollow "the top of the tunnel sits 1.2 metres (4 ft) below the riverbed" (Wikipedia, North Yonge subway extension; depth-findings Table B)."""),
    'No running-tunnel sample has its roof above ground. The West Don crossing keeps at least 1.2 m of cover (documented); other crossings keep 1.0 m (ESTIMATE).',
    d("""1. In `bake-profile.mjs`, add
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
       - `assert('West Don crossing keeps 1.2 m cover', …)`: over s 34600-34700, `ground - rail - 5.0 >= 1.2 - 0.05`."""),
    d("""- Both new tests PASS.
    - These still PASS: `max grade within the documented 4%`, `no sudden steps: every 5 m step within the max grade`, `grade changes gradually (vertical curves)`, `platforms are level`, `rail is below ground at portals`."""))

add('04', 'tunnel-types-bake', 'Correct Line 1 tunnel types and depths from depth-findings',
    'scripts/bake-profile.mjs data/structure_depths.json', 'docs/depth-findings.md', '01, 03',
    d("""`construction(s, cls)` in `bake-profile.mjs` (~line 84) returns:
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
    (e) Lawrence station is 18.3 m below the street (TTC via blogTO 2025)."""),
    'The construction labels match the documents, and Lawrence sits deep. Every new number is labelled documented or ESTIMATE in `data/structure_depths.json`.',
    d("""1. Add these entries to `data/structure_depths.json`:
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
    4. Leave the 1.2 m West Don minimum cover from prompt 03 in force."""),
    d("""- `npm test` passes, including `max grade within the documented 4%`, `platforms are level` and prompt 03's `no tunnel roof above ground outside covered ways`.
    - The bake log line `lengthsByConstructionM` shows 'bored (North Yonge)' at more than 4000 m and 'bored (Spadina, under Casa Loma)' at about 770 m."""))

add('05', 'tunnel-types-tests', 'Tests for the corrected tunnel types',
    'scripts/physics-test.mjs', 'scripts/bake-profile.mjs data/structure_depths.json', '04',
    'After prompt 04 the profile has the new construction labels, but no test pins them.',
    'Regression tests that fail if a future bake reverts the documented tunnel types.',
    d("""1. In `scripts/physics-test.mjs`, after the existing profile tests, read `profile.construction` at given chainages with `idx = Math.round(s / profile.stepM)`.
    2. Add:
       - `assert('Casa Loma section is a tunnel bore', construction at 17800 starts with 'bored')`.
       - `assert('North Yonge between stations is bored', 31500 and 35300 both 'bored (North Yonge)')`.
       - `assert('Hogg’s Hollow and Sheppard-Finch are boxes', 34600 and 37800 both start with 'box')`.
       - `assert('Lawrence rail is about 18.3 m below ground', |ground - rail - 18.3| < 1.5 at the Lawrence chainage from line1.json)`.
       - `assert('North Yonge bore diameter documented', structure.northYongeBoreDiameter.value === 4.9 && status === 'documented')`."""),
    '- All five new tests PASS, and the existing tests still PASS.')

add('06', 'bore-diameter-render', 'Render each bored section with its own diameter',
    'src/game/World.ts', 'src/game/Track.ts', '04',
    d("""`World.ts` draws every 'bored…' section with `boredSection()` using one `BORE_ID_M = 5.4` (TYSSE, documented).
    `otherTrackLat()` returns null in bored sections (twin single-track tubes)."""),
    'Diameter per section: TYSSE 5.4 m (documented); North Yonge 4.9 m (documented); Spadina under Casa Loma 4.9 m (ESTIMATE, same era); University 5.4 m (ESTIMATE, keep).',
    d("""1. Add `export const BORE_ID_BY_CONSTRUCTION: Record<string, { id: number; basis: string }>` covering the four labels above. Default to 5.4 for an unknown 'bored…' label.
    2. Change `boredSection()` to `boredSection(idM: number)`. Where the sweep is built (~line 216), split bored runs by construction label and pass the matching diameter. Keep `BORE_AXIS_ABOVE_RAIL_M`, scaled as `idM/2 - 1.0` (ESTIMATE: rail about 1 m above the invert).
    3. Keep the twin-tube behaviour: `otherTrackLat` stays null for all bored labels."""),
    d("""- `npx tsc --noEmit` is clean.
    - The smoke test `world built with tunnels, viaducts and portals` passes, and `boredM` in the debug world stats is more than 12000."""))

add('07', 'platform-grade-clamp', 'Platform grade clamp (documented 0.3%) instead of dead-level pins',
    'scripts/bake-profile.mjs scripts/physics-test.mjs', 'docs/depth-findings.md', '01',
    d("""Platforms are pinned dead level, and the test `platforms are level` requires a rise of 0.000 m.
    TTC design criteria allow ±0.3% through stations (VNSL 2007 design table; cited in docs/depth-findings.md §D). ION LRT's bake uses the same idea as `PLATFORM_MAX_GRADE`."""),
    'A single `PLATFORM_MAX_GRADE = 0.003` clamp. The platform profile may follow the alignment up to ±0.3%, which removes kinks at platform ends.',
    d("""1. In bake-profile.mjs, add `const PLATFORM_MAX_GRADE = 0.003; // documented: TTC design criteria ±0.3% through stations (VNSL 2007 Response to Conditions of Approval, design-criteria table)`.
    2. Replace the level pin: over each platform, fit a straight line to the unpinned rail, clamp its slope to ±PLATFORM_MAX_GRADE, and pin the platform samples to that line.
    3. In physics-test.mjs, rename `platforms are level` to `platform grade within ±0.3%`, asserting `|rise| / length <= 0.0031` per platform."""),
    '- `platform grade within ±0.3%` PASSES, and every other profile test still PASSES.')

add('08', 'terrain-design-only-rebake', 'Fast design-only terrain rebake (no HRDEM refetch)',
    'scripts/bake-profile.mjs package.json .gitignore', 'scripts/lib-geo.mjs', '01',
    d("""A full `node scripts/bake-profile.mjs` re-samples HRDEM for 120 terrain tiles over the network, then carves them (`carve(h0, x, z)` ~line 300).
    `PROFILE_ONLY=1` skips the terrain completely, so every profile change needs a slow network rebake. ION LRT has `--design-only`, which re-carves from cached raw heights."""),
    '`DESIGN_ONLY=1 node scripts/bake-profile.mjs` re-carves terrain from a local raw-height cache in seconds, offline.',
    d("""1. In the terrain section, write the uncarved per-tile heights to `scripts/raw/terrain-raw.bin`, plus `scripts/raw/terrain-raw.json` with `{ tiles: ["x,y"...], grid: 129, format: "Float32 LE" }`.
    2. When `process.env.DESIGN_ONLY` is set and the cache exists, read the raw heights from it instead of calling `sampleHrdem`. Throw a clear error if the cache is missing.
    3. Add `"bake:design": "DESIGN_ONLY=1 node scripts/bake-profile.mjs"` to package.json.
    4. Add `scripts/raw/terrain-raw.*` to .gitignore; it is about 8 MB and rebuildable."""),
    d("""- `npm test` passes; nothing changes when DESIGN_ONLY is unset.
    - The bake logs `terrain: design-only from cache` when DESIGN_ONLY=1."""),
    manual='The full network rebake with the current scripts was run on 2026-11-22 (terrain/OIWMS outputs unchanged). The raw-height cache only exists once this step adds it, so after merge run once: `flock /tmp/nigian-heavy-tests.lock node scripts/bake-profile.mjs` (network, about 2 min) to write `scripts/raw/terrain-raw.*`; after that `npm run bake:design` is offline.')

add('09', 'station-wiki-parse', 'Fill station neighbourhood and levels from the cached Wikipedia HTML',
    'scripts/bake-stations-wiki.mjs public/data/line1_stations.json scripts/physics-test.mjs', 'src/game/Track.ts', 'none',
    d("""`scripts/bake-stations-wiki.mjs` reads full article HTML from `scripts/raw/wiki-html/*.html`. That cache is git-ignored, is already filled for all 38 stations, and has `<!-- title: … -->` on line 1.
    `npm test` runs it offline (`WIKI_OFFLINE=1`) through `test:data` and rewrites `public/data/line1_stations.json`.
    Only 5 of 38 stations have `neighbourhood`, and 14 of 38 have `levels`. The functions to improve are `levels(rows, text)` and `neighbourhood(lead)`, around lines 110-125."""),
    'More stations filled, each value with a `basis`. Values never guessed: unknown stays `null`.',
    d("""1. `neighbourhood` becomes `{ value, basis }`. Look in:
       - the infobox rows `Neighbourhood`, `Location` or `Address` (take the place name before ", Toronto");
       - sentences such as "serves the X neighbourhood" or "located in X, a neighbourhood".
       `basis` = the row label or a quote of at most 120 chars.
    2. `levels` (already `{ value, basis }`): also count distinct rows in the article's station-layout table containing "level" (for example "Street level", "Concourse", "Platform level"), using `<table class="wikitable"` sections that contain "Platform level".
    3. Do not fetch anything. The cache has every article. (Kiwix at 127.0.0.1:8095 is only needed if the cache is deleted; a person starts and stops it then.)
    4. In physics-test.mjs, add:
       - `assert('station neighbourhood/levels values carry a basis', every non-null has basis)`;
       - `assert('station coverage reported', true, 'neighbourhood N/38, levels M/38')`."""),
    d("""- `npm test` passes; the new tests PASS.
    - The detail line shows neighbourhood ≥ 20/38 and levels ≥ 25/38. If lower, list in the reply which stations have no source text."""))

# ---------------------------------------------------------------- audio / doors
add('10', 'audio-engine', 'Synthesised traction motor and rolling sound module',
    'src/game/Audio.ts', 'src/game/Physics.ts', 'none',
    'The game has no sound.',
    'A Web Audio module (no audio files) that the next prompt wires into the game.',
    d("""1. Create `src/game/Audio.ts` exporting `class TrainAudio` with `start(): void`, `setMuted(m: boolean)`, `update(vMs: number, lever: number, inTunnel: boolean, dt: number)` and `readonly started: boolean`, `muted: boolean`.
    2. `start()` creates the AudioContext lazily inside try/catch and never throws (headless Chromium may have no audio device).
    3. Motor whine: two detuned sawtooth oscillators → low-pass filter.
       - Pitch = 60 + 840 · min(1, v/24.4) Hz (ESTIMATE, tuned by ear).
       - Gain = 0.25 · |lever| while powering or braking, otherwise 0.03.
    4. Rolling: a looped white-noise buffer → band-pass at 300-900 Hz. Gain rises with speed. In tunnels: +3 dB and a slightly lower filter (ESTIMATE).
    5. All parameter changes use `setTargetAtTime(…, 0.05)`.
    6. No copied recordings, no samples."""),
    '- `npx tsc --noEmit` is clean. Nothing imports Audio.ts yet, so the build and smoke tests are unchanged and PASS.')

add('11', 'audio-hook', 'Wire the sound into the game (M to mute)',
    'src/game/Game.ts scripts/smoke-test.mjs', 'src/game/Audio.ts src/game/Input.ts', '10',
    '`TrainAudio` exists but is unused. `Game.frame()` steps physics, then updates the HUD. `debug` is a `SimDebug` object.',
    'Sound starts on the first key or click. `M` toggles mute and adds `Sound off` to the HUD. `debug.audio = { started, muted }`.',
    d("""1. In `Game.ts`:
       - create `this.audio = new TrainAudio()`;
       - in the constructor, `window.addEventListener('keydown'|'pointerdown', () => this.audio.start(), { once: true })`;
       - a separate keydown for `KeyM` toggles mute;
       - call `this.audio.update(st.v, this.physics.lever, this.track.classAt(st.s) === 'tunnel', dt)` once per frame.
    2. Add `audio?: { started: boolean; muted: boolean }` to `SimDebug` and fill it each frame.
    3. In `scripts/smoke-test.mjs`, before `no console errors`:
       - press `KeyM` once;
       - add `assert('audio state exposed and mute toggles', dbg.audio && dbg.audio.muted === true)`."""),
    '- `npm test` passes, including the new smoke assert and `no console errors`.')

add('12', 'door-cycle-core', 'Door cycle state machine (ION LRT timing) with tests',
    'src/game/DoorCycle.ts scripts/doors-test.mjs package.json', 'src/game/Physics.ts', 'none',
    'There are no doors.',
    d("""A pure, DOM-free state machine using ION LRT's documented-by-design timeline: close chime at 0 s, door motion at 0.85 s, leaves seated at 2.85 s (2.0 s travel), interlock at 2.95 s.
    Open: chime at 0 s, motion 0.22-2.02 s. All timings are ESTIMATEs carried over from ION LRT's `DoorCycle.ts` (read for reference only: /home/nig/ion-LRT/src/game/DoorCycle.ts; never edit it)."""),
    d("""1. Create `src/game/DoorCycle.ts`:
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
    3. In package.json add `"test:doors": "node scripts/doors-test.mjs"` and insert it into `test` after `test:physics`."""),
    '- `npm test` runs the doors tests and all four PASS.')

add('13', 'door-hook-chime', 'Doors in the game: O/K keys, original TTC-style chime, traction interlock',
    'src/game/Game.ts src/game/Audio.ts index.html', 'src/game/DoorCycle.ts src/game/World.ts', '11, 12',
    '`DoorCycle` exists but is unused. `Game.ts` has `this.layouts` (each with `s0`, `s1` and `name`) and `CONSIST_LENGTH_M` (138, ESTIMATE).',
    'Doors open only when stopped with the whole train on a platform. Traction is cut until the interlock. An original synthesised chime plays. A HUD indicator shows door state.',
    d("""1. `Audio.ts`: add `chime(kind: 'open' | 'close')`.
       - Original synthesis: sine plus a soft triangle, each note with an 8 ms attack and exponential decay.
       - Close: three descending notes, G5–E5–C5 (783.99, 659.26, 523.25 Hz), 0.30 s apart, each ringing 0.72 s (the last 0.95 s).
       - Open: a single G5 for 0.65 s.
       - The note choice follows public descriptions of the TTC door-close tones (as cited in ION LRT's `DoorCycle.ts` header). It is synthesised, never sampled or copied.
       - Add `thud()`, a short low-passed noise burst for 'close-seated'.
    2. `Game.ts`:
       - `this.doors = new DoorCycle()`.
       - `KeyO` → `requestOpen(v < 0.1 && s - CONSIST_LENGTH_M >= layout.s0 - 2 && s <= layout.s1 + 2)` for the current layout. `KeyK` → `requestClose()`.
       - Each frame, map the events to `audio.chime` / `thud`. If `!doors.tractionAllowed`, force `physics.lever = Math.min(physics.lever, 0)`.
       - `debug.doors = doors.phase + (doors.locked ? ' locked' : '')`.
    3. `index.html`: add `<div id="doors"></div>` inside `#hud`. `Game.ts` writes `DOORS OPEN`, `DOORS CLOSING` or nothing to it."""),
    d("""- `npm test` passes.
    - Add no smoke assert in this prompt (smoke-test.mjs is not in files). Prompt 99 adds one."""))

# ---------------------------------------------------------------- speed limits / ATC
add('14', 'speed-limit-bake', 'Bake civil speed limits (generated, ESTIMATE rules)',
    'scripts/bake-speed.mjs package.json .gitignore', 'public/data/line1.json src/game/Track.ts scripts/lib-geo.mjs', 'none',
    'There is no speed-limit data.',
    '`public/data/line1_speed.json` is generated by `bake:derived` (git-ignored, like the profile), so `npm test` always rebuilds it.',
    d("""1. Create `scripts/bake-speed.mjs`. Read `public/data/line1.json` (`track`: local x,z points; `stations` with `chainageM`) and write `public/data/line1_speed.json`:
       `{ source, rules: {…}, sections: [{ s0, s1, limitKmh, reason, basis }] }`.
    2. Rules, all ESTIMATE unless the basis says otherwise:
       - line max 80 km/h;
       - curve limit `floor(3.6*sqrt(0.9*R)/5)*5`, minimum 25. R is from three points 30 m apart, and the curve is padded ±50 m;
       - 35 km/h over the last 300 m before each terminal, and 15 km/h over the last 60 m.
    3. Merge equal neighbours, and fold any section under 100 m into the lower neighbour.
    4. Self-check: sections cover 0 to the line length with no gap, and every limit is in [15, 80]. Otherwise `process.exit(1)` with a message.
    5. In package.json, append ` && node scripts/bake-speed.mjs > logs/bake-speed.log` to `bake:derived`.
    6. Add `public/data/line1_speed.json` to .gitignore."""),
    '- `npm test` passes, and the bake’s self-check runs as part of it.')

add('15', 'atc-core', 'ATC/CBTC-style speed supervision core with tests',
    'src/game/Atc.ts scripts/atc-test.mjs package.json', 'src/game/Physics.ts scripts/physics-test.mjs', '14',
    'There is no train protection.',
    'A pure `Atc` class that supervises the civil limits with a braking curve, a warning and a latched penalty brake. It is simplified: no other trains.',
    d("""1. Create `src/game/Atc.ts`: `export class Atc { constructor(sections: {s0:number;s1:number;limitKmh:number}[], decel = 0.8 /* ESTIMATE */); update(s, v, consistLen = 138): AtcState }`.
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
    3. package.json: add `"test:atc": "node scripts/atc-test.mjs"` and insert it into `test` after `test:physics`."""),
    '- `npm test` passes, with the four ATC tests PASS.')

add('16', 'atc-hook-hud', 'ATC in the game: HUD target speed, penalty brake',
    'src/game/Game.ts src/main.ts scripts/smoke-test.mjs', 'src/game/Atc.ts', '15',
    '`Atc` exists but is unused. `main.ts` loads data with `json(url, required)`, and `GameData` is declared in Game.ts.',
    'The HUD shows `ATC 55 → 35 in 240 m`. An overspeed warning shows in amber (`.warn`) and the penalty in red (`.bad`). The penalty forces the emergency brake until released (full brake lever at standstill).',
    d("""1. `main.ts`: load `./data/line1_speed.json` (optional) and pass `speed: { sections } | null` in GameData. Add the field to the interface in Game.ts.
    2. `Game.ts`:
       - if sections exist, `this.atc = new Atc(sections)`;
       - each fixed step, call `update`;
       - on penalty set `physics.emergency = true`;
       - set `releaseRequested = input.lever <= -0.99`;
       - add the HUD lines;
       - `debug.atc = state`.
    3. `smoke-test.mjs`: add `assert('ATC state exposed', typeof final.atc?.limitKmh === 'number')`."""),
    '- `npm test` passes; the new assert and `no console errors` PASS.')

add('17', 'speed-boards', 'Lineside speed boards (generic design)',
    'src/game/World.ts src/game/Game.ts', 'src/game/Atc.ts', '16',
    'There are no speed boards. Station signs use a canvas texture (see the 2048 px sign code in World.ts).',
    'A board 30 m before each lower limit and a "limit ends" board where the limit rises. The design is generic: a white 0.6 × 0.8 m panel, black border, black numerals, on the right side at cab-window height.',
    d("""1. Change `buildWorld(scene, track, layouts)` to take an optional 4th parameter `speed?: {s0;s1;limitKmh}[]`. `Game.ts` passes `data.speed?.sections`.
    2. Create one CanvasTexture per distinct number and share materials. Mount the boards on the tunnel wall (box: lateral `BOX_HALF_CLEAR_M - 0.1`; bored: radius − 0.3) or on a 1.6 m post outdoors.
    3. Add `speedBoards` to `WorldStats`."""),
    '- `npm test` passes. `world.speedBoards > 0` shows in the debug output, and the draw calls in the `views` lines rise by less than 10%.')

# ---------------------------------------------------------------- traction power
add('18', 'substations-bake', 'Traction substations from OSM (600 V DC third rail), ESTIMATE gaps',
    'scripts/bake-substations.mjs package.json .gitignore', 'scripts/raw/osm-substations.json scripts/lib-geo.mjs public/data/line1.json', 'none',
    d("""`scripts/raw/osm-substations.json` holds a committed Overpass result: 27 power=substation/converter features within 400 m of Line 1.
    Of these, 6 have operator TTC / Toronto Transit Commission (one named "Orde Substation") and 1 has substation=traction. The rest belong to Hydro or are untagged.
    Line 1 uses a 600 V DC third rail (documented system voltage; the TTC subway is commonly cited at 600 V DC. Note it as "verify")."""),
    '`public/data/line1_substations.json` is generated in `bake:derived`: TTC/traction sites projected to chainage, plus ESTIMATE filler sites wherever a gap exceeds 2.5 km.',
    d("""1. Create `scripts/bake-substations.mjs`:
       - keep features with operator matching /TTC|Toronto Transit/ or `substation=traction`;
       - project each to chainage (nearest track point) and keep those within 400 m;
       - output `{ source: 'OpenStreetMap contributors, ODbL', nominalV: 600, sites: [{ s, name, osmId, confidence: 'osm' | 'estimate', basis }] }`, sorted by `s`.
    2. In every gap longer than 2500 m, insert `confidence: 'estimate'` sites, evenly spaced, with basis "ESTIMATE: TTC substations not all mapped in OSM".
    3. package.json: append ` && node scripts/bake-substations.mjs > logs/bake-substations.log` to `bake:derived`.
    4. .gitignore: add `public/data/line1_substations.json`."""),
    '- `npm test` passes. The bake prints `N osm + M estimate sites`, no gap exceeds 2.5 km, and it exits 1 otherwise.')

add('19', 'traction-power-model', 'Traction power model: 600 V sag, aux load, regen blend (pure, tested)',
    'src/game/TractionPower.ts scripts/power-test.mjs package.json', 'src/game/Physics.ts', '18',
    'Physics assumes full traction voltage everywhere.',
    'A pure model after ION LRT\'s `TractionPower.ts` (read-only reference: /home/nig/ion-LRT/src/game/TractionPower.ts), adapted to 600 V DC third rail.',
    d("""1. Create `src/game/TractionPower.ts` with:
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
    4. package.json: `test:power` in the test chain."""),
    '- `npm test` passes, with the four power tests PASS.')

add('20', 'traction-power-hud', 'Use line voltage in physics and show a power panel',
    'src/game/Game.ts src/game/Physics.ts src/main.ts', 'src/game/TractionPower.ts', '19',
    'TractionPower is unused.',
    'Available traction scales with line voltage. The HUD shows `600 V · 1.2 kA · regen 40%`. `debug.power` is exposed.',
    d("""1. `Physics.ts`: add `powerScale = 1` (a public field) that multiplies the traction force cap.
       The existing physics tests must still pass with powerScale = 1.
    2. `main.ts`: load `./data/line1_substations.json` (optional) into `GameData.substations`.
    3. `Game.ts`: each fixed step, compute `tractionW = max traction force × v` (power positive, regen negative) and call `samplePower`.
       Set `physics.powerScale = r.tractionScale` and `debug.power = r`. Add one HUD line."""),
    '- `npm test` passes, including `full power still climbs a 4% grade from rest`.')

# ---------------------------------------------------------------- imagery cache
add('21', 'tile-cache-core', 'Persistent map tile cache: shared sim rule set (IndexedDB, 16 GB LRU)',
    'src/game/TileCache.ts scripts/tilecache-test.mjs package.json', 'src/game/Terrain.ts scripts/lib-overpass.mjs', 'none',
    d("""Hi-res imagery comes only from local baked JPEGs in `public/imagery/` (tiles within 250 m of the track). There is no browser cache.
    OSM is bake-time only: `scripts/lib-overpass.mjs` asks nigian's Overpass at `http://127.0.0.1:12346/api/interpreter` first, then public mirrors, and stops after 3 missed requests. The game makes no Overpass calls."""),
    d("""`src/game/TileCache.ts` implements the shared sim map-cache rule set. The pattern is nig-drives `src/game/map/OverpassCache.ts` (read only, never edit nig-drives; its key points are copied here):
    - IndexedDB store with `navigator.storage.persist()`;
    - 16 GB cap with LRU eviction (cap = min(16 GiB, 0.8 × `navigator.storage.estimate().quota`));
    - version-prefixed keys, and the cache is read before the network;
    - a network cooldown that stops after 3 missed tiles;
    - `stats()` and `clear()` for a UI size readout and Clear button (prompt 22 adds the UI);
    - fail soft: private mode, no IndexedDB or quota errors behave as a miss;
    - Bing, Cesium and Google 3D Tiles are never disk-cached beyond their HTTP cache headers. `cacheable(url)` returns false for those hosts, so they always go to `fetch` with the browser's normal HTTP cache. OIWMS (Open Government Licence – Ontario) may be cached."""),
    d("""1. Create `src/game/TileCache.ts` exporting:
       - `CACHE_VERSION = 'ttc1'` and `key(kind: 'oiwms', z, x, y)`, which returns `` `${CACHE_VERSION}:${kind}:${z}/${x}/${y}` ``;
       - `CAP_BYTES = 16 * 1024 ** 3` (shared rule) and `MISS_LIMIT = 3`;
       - `cacheable(url: string): boolean`, which is false when the host matches `/(virtualearth|bing)\\.(net|com)|cesium\\.com|tile\\.googleapis\\.com|googleapis\\.com\\/.*3dtiles/i`;
       - `interface Row { key: string; blob: Blob; bytes: number; lastUsed: number }`;
       - `interface Backend { get(k): Promise<Row|null>; put(r: Row): Promise<void>; delete(k): Promise<void>; all(): Promise<Row[]>; clear(): Promise<void> }`;
       - `createMemoryBackend()`;
       - `createIdbBackend(dbName = 'ttc-sim-tiles')`, an IndexedDB store keyed by `key` with a `lastUsed` index. It resolves null when `indexedDB` is undefined or open fails;
       - `askPersist(): Promise<boolean|null>`. It calls `navigator.storage.persisted()` and then `persist()` when available, and records the result in `storagePersisted`. It is null when `navigator` is absent;
       - `class TileCache { constructor(backend: Backend|null, capBytes = CAP_BYTES) }` with these methods:
         - `get(k)`: a hit updates `lastUsed`;
         - `put(k, blob)`: after a put, when the total is over the cap, delete the least-recently-used rows until the total is ≤ 95% of the cap;
         - `fetchTile(url, k, fetcher = fetch)`: cache first (when `cacheable(url)`), then the network when not cooling. A non-ok answer or a throw counts as a miss. After `MISS_LIMIT` consecutive misses, `cooling` is true and the network is skipped for 10 minutes (`COOLDOWN_MS = 600_000`). A success resets the miss count. It returns `Blob|null` and never throws;
         - `stats(): Promise<{ count, bytes, persisted, cooling }>`;
         - `clear(): Promise<void>`.
       A null backend acts as an always-miss cache.
    2. Create `scripts/tilecache-test.mjs` (esbuild loader as in `scripts/physics-test.mjs`, memory backend, fake fetcher, injectable clock). It asserts:
       - `versioned keys` (the key starts with `ttc1:`);
       - `cache read before network` (a second fetchTile for the same key makes no fetcher call);
       - `get refreshes LRU order`;
       - `eviction trims to 95% of cap, oldest first` (use a small cap such as 1000 bytes);
       - `cooldown after 3 missed tiles` (the 4th call makes no fetcher call; after the clock passes `COOLDOWN_MS` it tries again);
       - `success resets miss count`;
       - `Bing/Cesium/Google 3D Tiles not disk-cached` (after fetchTile, a `virtualearth.net` URL leaves the store empty);
       - `clear empties stats`;
       - `persist is optional (no navigator)`.
    3. package.json: add `"test:tilecache": "node scripts/tilecache-test.mjs"` and put it in `test` after `test:physics`."""),
    '- `npm test` passes, with all nine cache tests PASS.\n- The `TileCache.ts` header comment names nig-drives `OverpassCache.ts` as the pattern and lists the rule set.')

add('22', 'oiwms-live-tiles', 'Live OIWMS tiles through the tile cache, plus a cache size readout and Clear button',
    'src/game/Terrain.ts src/game/CachePanel.ts src/main.ts', 'src/game/TileCache.ts src/game/Game.ts index.html', '21',
    '`Terrain.updateImagery(cameraPos)` loads hi-res textures only for tiles in the baked index; other tiles stay low-res. There is no cache UI.',
    d("""Tiles with no baked hi-res image load live from OIWMS through `TileCache.fetchTile` (cache first, 16 GB LRU, cooldown after 3 missed tiles; see 21 and nig-drives `OverpassCache.ts`).
    The URL is `https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_Imagery/Ontario_Imagery_Web_Map_Service/MapServer/tile/{z}/{y}/{x}` (no key, Open Government Licence – Ontario).
    A small corner panel shows the cache size and has a Clear button."""),
    d("""1. `Terrain.ts`:
       - add `private cache = new TileCache(null)` and an `async initCache()` that swaps in `createIdbBackend()` and calls `askPersist()`;
       - in `updateImagery`, when the baked index has no hi-res entry for a z15 tile within 1300 m, run `loadLive(tile)`. It fetches the 16 z17 tiles through `cache.fetchTile(url, key('oiwms', 17, x, y))` with at most 4 in flight, skips nulls, draws them on a 1024 px canvas and makes a `CanvasTexture` (sRGB). Keep the existing LOD rules (load within 1300 m, drop beyond 2000 m, dispose on drop);
       - while `cache.stats().cooling` is true, do not start new live loads;
       - any failure keeps the low-res texture quietly, with no console.error.
    2. Create `src/game/CachePanel.ts` with `mountCachePanel(cache: TileCache, parent = document.body)`. It adds a small fixed bottom-left `div#cache-panel` (inline styles, about 11 px text, semi-transparent dark background, so no CSS file edit is needed) that shows `Map cache: <n> tiles · <MB> MB` (GB above 1024 MB), `· persistent` or `· may be cleared by browser`, and `· network paused (3 misses)` while cooling. It has a `button#cache-clear` labelled `Clear`, which runs `cache.clear()` and then refreshes. Refresh every 5 s and after each clear. Do not catch keyboard keys, so the driving controls keep working.
    3. `Terrain` exposes `readonly cache`. `main.ts` calls `await game.terrain?.initCache()` (when terrain exists) and `mountCachePanel(game.terrain.cache)` after `game.start()`. Leave `window.__ttcSim` and `__ttcSimTeleport` unchanged.
    4. Keep the attribution unchanged. It already credits OIWMS (OGL-Ontario) and OSM (ODbL)."""),
    d("""- `npm test` passes. The smoke test runs offline, so live fetches miss; after 3 misses the cooldown stops further requests, and `no console errors` still passes.
    - `#cache-panel` and `#cache-clear` exist in the page."""))

# ---------------------------------------------------------------- train model / input
add('23', 'blender-tr-script', 'Verify and tidy the TR-style Blender script and GLBs (already built)',
    'scripts/blender/tr_car.py public/models/README.md', 'src/game/Train.ts package.json', 'none',
    d("""Done by the TTC Sim bot on 2026-11-22: `scripts/blender/tr_car.py` builds `public/models/tr_cab.glb` (1 782 tris, 97 KB) and `tr_mid.glb` (1 548 tris, 82 KB) in Blender 4.3.2. The GLBs and the preview `docs/images/tr-preview.png` are committed, and `npm run check:py` (first in `test`) compiles the script.
    Dimensions are ESTIMATE constants at the top of the script. The front is glTF +Z (Blender −Y), matching `Train.ts` `car.lookAt(front)`, and the origin is at rail level at the car centre."""),
    'A tidy-only pass: the script and README agree, every dimension constant carries `ESTIMATE` or a documented basis, and there are no trademark elements. No geometry change is needed.',
    d("""1. Read `scripts/blender/tr_car.py`. Make sure every dimension constant has an `# ESTIMATE` comment or a documented basis (gauge 1495 mm is documented). Fix only comments or docstrings, and do not change any numbers.
    2. Make sure `public/models/README.md` lists the same values as the script constants and states "original non-trademark tribute". Fix any mismatch in the README.
    3. Do not add text, logos or numbers to the model. Do not edit package.json (`check:py` already exists)."""),
    '- `npm test` passes (`check:py` compiles the script).\n- `git diff` touches only comments, docstrings or the README.',
    manual='Only if geometry changes later: `flock /tmp/nigian-heavy-tests.lock blender -b --factory-startup -P scripts/blender/tr_car.py -- --out public/models --preview docs/images/tr-preview.png`, then commit the GLBs (< 1.5 MB each).')

add('24', 'load-tr-model', 'Verify the TR GLB cars in game (already wired, box fallback)',
    'src/game/Train.ts scripts/smoke-test.mjs', 'src/game/Game.ts src/main.ts', '23',
    d("""Done by the TTC Sim bot on 2026-11-22: `Train.ts` exports `loadTrModels()` (GLTFLoader) and `Train.setModels()`. That puts the cab at both ends (the rear one turned 180°) and middle cars between, with shadows on. `main.ts` loads the models after `game.start()` and keeps the boxes if the files are missing. `debug.trainModel` is `glb` or `boxes`, and the smoke test asserts `glb` when `public/models/tr_cab.glb` exists."""),
    'A verification pass with small fixes only: the box geometry replaced by `setModels` is disposed, and the materials too.',
    d("""1. In `Train.setModels`, also dispose the replaced box materials (`(c as THREE.Mesh).material`, single or array). Do not touch the GLB clones (their geometry is shared).
    2. In `scripts/smoke-test.mjs`, keep the `train model reported` assert. Print `info train model <glb|boxes>`."""),
    '- `npm test` passes with `train model reported` PASS (`glb`).')

add('25', 'gamepad-map', 'Full Xbox controller mapping (pure, tested)',
    'src/game/Input.ts scripts/input-test.mjs package.json', 'src/game/Game.ts', 'none',
    '`Input.ts` reads RT (button 7) = power and LT (6) = brake only, with a 0.05 dead zone. When either is pressed it overrides the keyboard lever.',
    'An exported pure `mapPad(buttons: number[], axes: number[], prev: number[])` covering the whole mapping, with press-edge detection.',
    d("""1. Mapping, standard layout:
       - RT 7 power, LT 6 brake, `lever = RT − LT` when either is past 0.05;
       - left stick Y (axis 1) notches the lever at `LEVER_RATE_PER_S`, dead zone 0.2, up = power;
       - D-pad 12/13: ±0.1 per press;
       - A 0 coast; B 1 emergency toggle; Y 3 camera; X 2 doors open; LB 4 doors close; View 8 mute.
       Output `{ lever?, notch, coast, emergencyToggle, camera, doorsOpen, doorsClose, mute }`.
    2. `Input.update()` uses it. Add public flags `doorsOpenPressed`, `doorsClosePressed` and `mutePressed` (cleared by consumers).
    3. Create `scripts/input-test.mjs` (esbuild loader). Asserts:
       - `trigger dead zone`;
       - `stick dead zone`;
       - `B toggles once per press`;
       - `D-pad notch clamps to [-1,1]`.
    4. package.json: `test:input` in the chain."""),
    '- `npm test` passes, with the four input tests PASS.')

add('26', 'controls-wiring-readme', 'Wire the gamepad door and mute buttons, update the help text and README controls',
    'src/game/Game.ts index.html README.md', 'src/game/Input.ts', '13, 25',
    'The gamepad flags from prompt 25 are not consumed. The `#help` text in index.html lists the keyboard plus RT/LT only.',
    'Gamepad X/LB/View act like O/K/M. The help line and the README "Controls" section list keyboard and Xbox controls.',
    d("""1. `Game.ts`: consume `input.doorsOpenPressed`, `doorsClosePressed` and `mutePressed` each frame, using the same handlers as the keys.
    2. `index.html` `#help`: add `O/K doors · M mute · Xbox: RT/LT power/brake, A coast, B emergency, Y camera, X/LB doors`.
    3. `README.md` "## Controls": a keyboard | Xbox | action table."""),
    '- `npm test` passes.')

# ---------------------------------------------------------------- polish (run last)
add('90', 'polish-hud-layout', 'Polish: HUD layout and readability',
    'src/style.css index.html src/game/Game.ts', 'scripts/smoke-test.mjs', 'all of 01-26',
    'The HUD is one bottom-left box: 48 px speed plus pre-formatted lines. The station panel is top-left and the help text top-right, 12 px.',
    'A readable cab HUD at 1280×720 and 1920×1080:'
    '\n- speed and ATC target large;'
    '\n- grade / section / power / doors as compact labelled rows;'
    '\n- nothing overlaps the attribution;'
    '\n- contrast ≥ 4.5:1;'
    '\n- help collapsible with `H`.',
    d("""1. Restructure `#hud` into a CSS grid:
       - big speed with a small ATC limit on its right;
       - rows: Next, Grade (% and ‰), Section, Power, Doors.
       Use `font-variant-numeric: tabular-nums`, with the `.warn`/`.bad` colours kept.
    2. `H` toggles `#help` (hidden by default after 10 s).
    3. `updateHud()` writes into fixed row elements by id, not into one pre block."""),
    '- `npm test` passes. `HUD shows speed and next station` still PASSES, so keep the `km/h` and `Next:` text.')

add('91', 'polish-cab-view-lighting', 'Polish: cab view and lighting',
    'src/game/Game.ts', 'src/game/Train.ts', '90',
    'The cab camera sits at the head of the train. The headlight is a SpotLight(0xfff2d8, 120, 260, 0.5, 0.8, 1.0) that fades out outdoors. Sun shadows cover ±110 m.',
    'The cab eye height is 2.6 m above the rail (ESTIMATE; TR floor about 1.1 m plus a seated driver). A slight head-bob comes from vertical acceleration. Tunnel exposure adapts over 1.5 s. The headlight cone does not clip the platform edge.',
    d("""1. Put the cab eye at +2.6 m and 0.8 m behind the nose, offset 0.5 m to the left of centre (ESTIMATE).
    2. Add an exposure lerp: `renderer.toneMappingExposure` goes toward 1.4 in tunnels and 1.0 outside, with a time constant of 1.5 s.
    3. Head-bob: ±2 cm vertical, driven by `|dv/dt|` and speed; off when stopped.
    4. Set the headlight target 60 m ahead at rail height."""),
    '- `npm test` passes. The `views` screenshots in logs/ are not black: the smoke test\'s `frame is not blank` passes.')

add('92', 'polish-platform-detail', 'Polish: platform detail (yellow edge strip, tactile edge, signs, lighting)',
    'src/game/World.ts', 'src/game/Track.ts', '90',
    'Platforms are flat slabs. Signs are 10×1.25 m, every 30 m. Station lighting is emissive only.',
    'Generic, non-trademark platform details:'
    '\n- a 0.6 m safety-yellow edge strip (#f2c200), plus a tactile dome band 0.6 m inboard (bumped normal or a fine grid texture);'
    '\n- 0.3 m light fixtures every 6 m on the ceiling (emissive);'
    '\n- station name signs kept;'
    '\n- a "mind the gap" style text-free stripe on the edge face.',
    d("""1. In the platform builder, add the strip and tactile band as merged geometry per platform (one draw call each).
    2. Add emissive ceiling fixtures as one InstancedMesh per station.
    3. Add `platformDetail: true` to WorldStats."""),
    '- `npm test` passes. The draw calls in the smoke `views` lines rise by less than 15 per station view.')

add('93', 'polish-tunnel-detail', 'Polish: tunnel detail (lighting, cable trays, signals)',
    'src/game/World.ts', 'src/game/Track.ts', '92',
    'Tunnel lamps every 25 m. Box and bore walls are plain.',
    d("""Box and bore sections get:
    - a cable tray (0.4×0.1 m, two levels, wall side away from the walkway);
    - a raised walkway edge;
    - generic wayside signal heads (dark housing, red/green lens, emissive) every 400 m on the right, ESTIMATE spacing, purely visual;
    - all as InstancedMesh or merged per 500 m chunk."""),
    d("""1. Add tray, walkway lip and signal geometry to the per-chunk builders.
    2. Signals show green unless the ATC (prompt 16) target ahead is lower, but keep World independent: just expose `setSignalAspect(i, 'g' | 'r')` and default to green.
    3. Add `signals: n` to WorldStats."""),
    '- `npm test` passes. `world.signals > 50`, and draw calls stay within +10%.')

add('94', 'polish-terrain-seams-lod', 'Polish: terrain/scenery seams and LOD pop',
    'src/game/Terrain.ts src/game/Scenery.ts', 'src/game/World.ts', '22',
    'Terrain tiles are THREE.LOD at 0/1400 m. Hi-res imagery swaps at 1300/2000 m. Visible cracks between tile LODs and a pop when hi-res arrives.',
    'No cracks: add skirts of 3 m down on every tile edge. Hi-res imagery fades in over 0.5 s (blend uniform or a material opacity crossfade). Scenery buckets use a hysteresis of ±100 m on visibility.',
    d("""1. Add skirts to both terrain LOD geometries.
    2. When a hi-res texture loads, crossfade from low to high over 0.5 s.
    3. Scenery: per-500 m bucket visibility with hysteresis (show < 1800 m, hide > 1900 m; ESTIMATE)."""),
    '- `npm test` passes, with `no console errors`.')

add('95', 'polish-performance', 'Polish: performance pass (draw calls, frame time on the RX 580)',
    'src/game/World.ts src/game/Scenery.ts scripts/smoke-test.mjs', 'src/game/Game.ts', '92, 93, 94',
    'Measured at 0.2.0 (`SMOKE_GPU=1`, RX 580 headless): 60 fps (vsync), 69–574 draw calls, 0.1–1.16 M triangles.',
    'Worst-view draw calls ≤ 400 and triangles ≤ 1.2 M with all polish in. The smoke test records frame-time percentiles.',
    d("""1. Merge static per-chunk meshes that share a material: tunnel lamps, trays, platform details.
    2. Set `frustumCulled` correctly, and avoid per-frame allocations in `Game.frame`.
    3. `smoke-test.mjs`: in the views loop, sample 120 frames with `requestAnimationFrame` timestamps and log `p50/p95 ms`.
       Add `assert('draw calls within budget at every view', maxCalls <= 400)`."""),
    '- `npm test` passes, including the new budget assert. Nigel can also run `SMOKE_GPU=1 flock /tmp/nigian-heavy-tests.lock npm run test:smoke` for the RX 580 numbers.')

add('96', 'polish-physics-feel', 'Polish: physics feel against documented TR figures',
    'src/game/Physics.ts scripts/physics-test.mjs docs/sources.md', 'src/game/Game.ts', 'all of 01-26',
    'Every constant in Physics.ts is an ESTIMATE (mass 240 t, traction 1.1 m/s², service brake 1.3, emergency 1.6, jerk 0.8).',
    'Use documented Toronto Rocket (TR) figures where a source is found in the repo docs. Otherwise keep the ESTIMATE and note "no source found". Notch response feels firm but smooth.',
    d("""1. Group the constants into `export const VEHICLE = { key: { value, basis } }`, keeping the exported names as aliases.
    2. Only if `docs/sources.md` lists a TR figure (for example max speed 88 km/h), switch that basis to documented with the citation. Never invent a source.
    3. Tune the jerk limit to 1.0 m/s³ (ESTIMATE) for snappier notch response, and check stopping-distance consistency.
    4. Tests:
       - `assert('80→0 km/h service stop within 280 m', …)` (ESTIMATE target);
       - `assert('jerk never exceeds limit', …)`."""),
    '- `npm test` passes, including the existing grade and power tests.')

add('97', 'polish-audio-mix', 'Polish: audio mix levels',
    'src/game/Audio.ts', 'src/game/Game.ts', '13',
    'The motor, rolling and chimes use ad-hoc gains.',
    d("""A master bus with a DynamicsCompressor and these levels (ESTIMATE, by ear):
    - chimes −6 dBFS peak;
    - motor −14 dB;
    - rolling −18 dB;
    - tunnel +3 dB with a short convolver-free slap-back echo (a delay of 60 ms at −12 dB).
    Ducking: chimes duck the motor by 6 dB for 1 s."""),
    d("""1. Add `master` (GainNode → DynamicsCompressor → destination) and route everything through it.
    2. Add a `MIX` constant object with the levels above (dB) and `dbToGain()`.
    3. Implement the ducking in `chime()`."""),
    '- `npx tsc --noEmit` is clean and `npm test` passes. With no audio device, nothing throws.')

add('98', 'polish-gamepad-feel', 'Polish: gamepad feel and dead zones',
    'src/game/Input.ts scripts/input-test.mjs', 'src/game/Game.ts', '25',
    'The dead zones are fixed (0.05 triggers, 0.2 stick) and linear.',
    'Radial stick dead zone 0.18 with a rescaled response curve (power 1.6), trigger dead zone 0.06 with an outer dead zone at 0.97, and optional rumble (`vibrationActuator.playEffect`) on penalty brake and door lock, guarded if unsupported. All values are ESTIMATEs.',
    d("""1. Implement `shape(v, inner, outer, gamma)` and use it for the triggers and stick.
    2. Add `Input.rumble(kind: 'penalty' | 'doors')`, a no-op if unsupported.
    3. Tests:
       - `assert('stick response is monotonic and 0 inside dead zone', …)`;
       - `assert('trigger reaches 1 at outer dead zone', …)`."""),
    '- `npm test` passes; the earlier input tests still PASS.')

add('99', 'polish-regression-readme', 'Polish: final full regression and README refresh',
    'scripts/smoke-test.mjs README.md docs/sources.md', 'src/game/Game.ts package.json', 'all',
    'The smoke test covers driving, the HUD, the station panel and the world stats. The README describes 0.2.0.',
    'One end-to-end regression and a refreshed README.',
    d("""1. `smoke-test.mjs`: teleport to Union platform, stop, press `KeyO`, wait 3 s, and assert:
       - `doors open at a platform` (`debug.doors` starts with 'open');
       - after `KeyK` and 3.2 s, `doors closed and locked`;
       - `power panel exposed` (`debug.power.volts` > 0, if prompt 20 is in);
       - `atc exposed`.
    2. `README.md`: refresh the features list, controls, tests (`npm test` chain), the estimates table pointing to `data/structure_depths.json`, the Game Coder prompts section, and the attribution. Remove anything stale.
    3. `docs/sources.md`: make sure every new data file has a source row."""),
    '- `npm test` passes, with every smoke assert PASS.')

# ---------------------------------------------------------------- write files
for f in glob.glob(os.path.join(OUT, '[0-9][0-9]-*.md')): os.remove(f)
def body(p):
    s = f"---\nrepo: {REPO}\nbranch: {BR}\nfiles: {p['files']}\n" + (f"read: {p['read']}\n" if p['read'] else '') + f"ctx: {p['ctx']}\ntitle: TTC {p['num']}: {p['title']}\n---\n"
    s += f"# TTC {p['num']} · {p['title']}\n\nDepends on: {p['depends']}. Repo `{REPO}`, branch `{BR}`. Files you may edit: `{p['files']}`.\n\n"
    s += f"## Current behaviour\n{p['current']}\n\n## Target\n{p['target']}\n\n## Steps\n{p['steps']}\n\n## Acceptance\n{p['accept']}\n\n## Test\n`{TEST}`, run from `{REPO}`. The queue runs it as the gate. Print nothing secret.\n"
    if p['manual']: s += f"\n## Manual follow-up (not for Devstral)\n{p['manual']}\n"
    return s + "\n" + RULES
for p in P:
    open(os.path.join(OUT, f"{p['num']}-{p['slug']}.md"), 'w').write(body(p))
rows = '\n'.join(f"| {p['num']} | {p['title']} | {p['depends']} | `{p['num']}-{p['slug']}.md` | `01-ttc-{p['num']}-{p['slug']}.md` | ☐ |" for p in P)
open(os.path.join(OUT, 'index.md'), 'w').write(f"""# Index: TTC Sim Game Coder prompts

Run order is file order: 01–26 is the backlog and 90–99 is polish (run last). Each step builds on the previous ones on the branch `{BR}`. If a step fails, the queue rolls it back, and later steps that depend on it will probably fail too: fix it and requeue from there.

| # | Title | Depends on | File | Queue file | Done |
|---|---|---|---|---|---|
{rows}
""")
open(os.path.join(OUT, '00-README.md'), 'w').write(f"""# TTC Sim → Game Coder / Devstral prompt pack

These are small, self-contained prompts in the Game Coder queue format: front matter (`repo`, `branch`, `files`, `read`, `ctx`, `title`) followed by the task. Each one touches 1–3 files (at most 4 small ones) and fits Devstral's 32k context.
**Source of truth:** `scripts/prompts/gen_prompts.py`. Edit there and run `python3 scripts/prompts/gen_prompts.py`, then commit.

## How the queue runs them
- Queue copies live in `/mnt/240G/ai/coder/queue/pending/` as `01-ttc-NN-<slug>.md`. That name sorts after Hydro-Lines (`00-zz-hl-*`) and before Nig Drives (`v160-*`, `v170-*`). The daemon runs pending files one at a time, in plain filename order.
- For each one, the daemon switches `{REPO}` to `{BR}` (it creates the branch from the current HEAD the first time). Aider edits only `files:`. Then the gates run: tsc lint → `npm test` (games.json runs `env -u PLAYWRIGHT_BROWSERS_PATH {TEST}`) → Code Checker. A pass is committed locally on the branch and **never pushed**. Finally the daemon switches back to `main`.
- The daemon refuses to start a step if the repo has uncommitted tracked changes, so keep `main` clean while the queue runs.
- Aider cannot run shell commands. Generated data (`line1_profile.json`, `line1_speed.json`, `line1_substations.json`) is git-ignored and rebuilt by `npm run bake:derived`, which runs before dev, build and test. Prompts therefore never list big generated JSON in `files:`.
- Manual follow-ups are marked in the prompts and need a person or the TTC Sim bot. Blender GLBs were built on 2026-11-22 (23 and 24 are now verify steps). The one-off network bake that writes the raw-height cache is still needed after 08.
- Map data follows the shared sim cache rule set (pattern: nig-drives `OverpassCache.ts`). Overpass goes to nigian 127.0.0.1:12346 first with public mirror fallback (`scripts/lib-overpass.mjs`). The browser tile cache is IndexedDB with persist(), a 16 GB LRU and version-prefixed keys, read before the network, with a cooldown after 3 missed tiles, a size readout and a Clear button (21–22). Bing, Cesium and Google 3D Tiles are never disk-cached beyond their HTTP headers.

## By hand in Game Coder
Use a fresh session per prompt. `/add` the files, `/read` the reads, paste the body, run `{TEST}`. Commit locally on `{BR}`; Nigel reviews and merges.

## Order and dependencies
See `index.md`:
- profile/tunnels 01–09;
- audio and doors 10–13;
- speed limits and ATC 14–17;
- traction power 18–20;
- imagery cache 21–22;
- train model and input 23–26;
- polish 90–99.

{RULES}
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
""")
print(len(P), 'prompts')
