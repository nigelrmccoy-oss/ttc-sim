---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: src/game/Audio.ts src/game/Game.ts
read: src/game/Physics.ts src/game/Input.ts
ctx: 32k
title: TTC 05: Synthesised traction motor and rolling sound
---
# 05 · Synthesised traction motor and rolling sound

Depends on: none. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`.

## Context
`Game.frame()` in `src/game/Game.ts` steps `this.physics` (a `TrainPhysics`). `physics.state` has `v` (m/s) and `s`; `physics.lever` runs from −1 (brake) to +1 (power). There is no sound yet.

## Task
1. Create `src/game/Audio.ts` exporting `class TrainAudio`. It uses only the Web Audio API: oscillators, noise buffers and filters. **No audio files and no copied recordings.**
   - Motor whine: two detuned sawtooth oscillators through a low-pass filter. Pitch is proportional to speed (≈ 60 Hz at 0 rising to ≈ 900 Hz at 88 km/h; ESTIMATE, tuned by ear). Gain rises with `|lever|` while powering or braking and falls when coasting.
   - Rolling noise: filtered white noise whose gain rises with speed. Add a soft periodic rail-joint click every 18 m of travel (ESTIMATE rail length), muted in tunnels if `classAt(s)` says `tunnel`. That is optional.
   - `update(v, lever, inTunnel)` smooths every parameter with `setTargetAtTime` so nothing clicks.
   - `start()` creates the `AudioContext` lazily, because browsers need a user gesture. `setMuted(bool)`.
2. In `Game.ts`: create `TrainAudio`; call `start()` on the first `keydown` or `pointerdown`; call `update` once per frame. Key `M` toggles mute and adds "Sound off" to the HUD when muted.
3. Expose `debug.audio = { started, muted }` in the existing `debug` object.

## Acceptance
- `npx tsc --noEmit` is clean, and `npm test` (the headless smoke test) still passes with no console errors. Headless Chromium has no audio device, so `start()` must not throw there.

## Test
`npx tsc --noEmit`
`flock /tmp/nigian-heavy-tests.lock npm test > logs/test.log 2>&1; grep -E 'FAIL|passed|console' logs/test.log | tail -n 40`

## Rules (every prompt)
- Edit only the files listed in `files:` above. Read the `read:` files for context; do not change them.
- Stack is Vite + TypeScript + Three.js. Keep `npx tsc --noEmit` clean.
- **Keys never get committed.** No API keys, tokens or passwords in code, data, logs or commit messages. None of these tasks need one.
- **Heavy runs go under the shared lock:** `flock /tmp/nigian-heavy-tests.lock <cmd>` for `npm test`, `npm run build`, bake scripts, Blender and anything that starts a browser.
- Headless only. Never open the game or a browser window on Nigel's screen. Kill any server you start.
- Trim output: send full logs to `logs/<name>.log` and look at them with `tail -n 40` or `grep`.
- Every number that is not from a cited source is labelled `ESTIMATE` in a comment or a `basis` field. No TTC logos, trademarks or copied sounds.
- Commit locally on the branch only. **Never push.** Nigel reviews first.
