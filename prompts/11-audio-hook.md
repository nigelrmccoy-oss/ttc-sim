---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Game.ts scripts/smoke-test.mjs
read: src/game/Audio.ts src/game/Input.ts
ctx: 32k
title: TTC 11: Wire the sound into the game (M to mute)
---
# TTC 11 · Wire the sound into the game (M to mute)

Depends on: 10. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`. Files you may edit: `src/game/Game.ts scripts/smoke-test.mjs`.

## Current behaviour
`TrainAudio` exists but is unused. `Game.frame()` steps physics, then updates the HUD. `debug` is a `SimDebug` object.

## Target
Sound starts on the first key or click. `M` toggles mute and adds `Sound off` to the HUD. `debug.audio = { started, muted }`.

## Steps
1. In `Game.ts`:
   - create `this.audio = new TrainAudio()`;
   - in the constructor, `window.addEventListener('keydown'|'pointerdown', () => this.audio.start(), { once: true })`;
   - a separate keydown for `KeyM` toggles mute;
   - call `this.audio.update(st.v, this.physics.lever, this.track.classAt(st.s) === 'tunnel', dt)` once per frame.
2. Add `audio?: { started: boolean; muted: boolean }` to `SimDebug` and fill it each frame.
3. In `scripts/smoke-test.mjs`, before `no console errors`:
   - press `KeyM` once;
   - add `assert('audio state exposed and mute toggles', dbg.audio && dbg.audio.muted === true)`.

## Acceptance
- `npm test` passes, including the new smoke assert and `no console errors`.

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
