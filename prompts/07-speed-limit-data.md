---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: scripts/bake-speed.mjs public/data/line1_speed.json package.json
read: public/data/line1.json public/data/line1_profile.json scripts/lib-geo.mjs src/game/Track.ts
ctx: 32k
title: TTC 07: Bake civil speed limits for speed boards and ATC
---
# 07 · Bake civil speed limits for speed boards and ATC

Depends on: none. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`.

## Context
The track centreline is in `public/data/line1.json`, with stations and the polyline. `src/game/Track.ts` shows how chainage `s` is computed. The vertical profile is in `line1_profile.json`.

## Task
1. Create `scripts/bake-speed.mjs`, which writes `public/data/line1_speed.json`:
   `{ source, basis, sections: [{ s0, s1, limitKmh, reason, basis }] }`
   `s0`/`s1` are metres of chainage.
2. Rules. Each one is an ESTIMATE unless the basis names a source.
   - Line maximum: 80 km/h. ESTIMATE; the TR train's design maximum is 88 km/h, so check before citing.
   - Curves: compute the horizontal radius R from three points 30 m apart. The limit is `floor(3.6*sqrt(0.9*R)/5)*5`, with lateral acceleration 0.9 m/s² (ESTIMATE), a minimum of 25 km/h, and the curve start and end padded by 50 m.
   - Terminals: 35 km/h over the last 300 m before Vaughan Metropolitan Centre and Finch, and 15 km/h on the last 60 m (ESTIMATE).
   - Crossovers and pocket tracks are unknown. Leave them out and say so in `basis`.
3. Merge neighbouring sections with the same limit. Never output a section shorter than 100 m; take the lower limit instead.
4. Add `"bake:speed": "node scripts/bake-speed.mjs"` to `package.json` and append it to `bake`.

## Acceptance
- Sections cover 0 to the line length with no gaps or overlaps, and every limit is between 15 and 80.
- Print a summary: the number of sections and the km at each limit.

## Test
`flock /tmp/nigian-heavy-tests.lock node scripts/bake-speed.mjs | tail -n 20`
`node -e "const d=require('./public/data/line1_speed.json');let p=0;for(const x of d.sections){if(Math.abs(x.s0-p)>0.01)throw x;p=x.s1}console.log('ok',d.sections.length,p)"`

## Rules (every prompt)
- Edit only the files listed in `files:` above. Read the `read:` files for context; do not change them.
- Stack is Vite + TypeScript + Three.js. Keep `npx tsc --noEmit` clean.
- **Keys never get committed.** No API keys, tokens or passwords in code, data, logs or commit messages. None of these tasks need one.
- **Heavy runs go under the shared lock:** `flock /tmp/nigian-heavy-tests.lock <cmd>` for `npm test`, `npm run build`, bake scripts, Blender and anything that starts a browser.
- Headless only. Never open the game or a browser window on Nigel's screen. Kill any server you start.
- Trim output: send full logs to `logs/<name>.log` and look at them with `tail -n 40` or `grep`.
- Every number that is not from a cited source is labelled `ESTIMATE` in a comment or a `basis` field. No TTC logos, trademarks or copied sounds.
- Commit locally on the branch only. **Never push.** Nigel reviews first.
