---
repo: /home/nig/ttc-sim
branch: gamecoder/ttc-sim-backlog
files: data/structure_depths.json docs/sources.md public/data/line1_profile.json
read: docs/depth-findings.md scripts/bake-profile.mjs
ctx: 32k
title: TTC 02: Fold documented depths into the profile
---
# 02 · Fold documented depths into the profile

Depends on: 01. Repo `/home/nig/ttc-sim`, branch `gamecoder/ttc-sim-backlog`.

## Context
After prompt 01, tunnel depths live in `data/structure_depths.json`. Most depths are still ESTIMATEs.
`docs/sources.md` lists documents found but not yet used: TTC board reports, City of Toronto Archives plans, the TYSSE environmental assessment and design reports, Metrolinx Yonge North reports, and Transit Toronto extension pages.
**You cannot browse the web.** A person, or the TTC Sim bot, reads those documents first. They fill in `docs/depth-findings.md`, a table with the columns `key | value | unit | quote/page | title | url | licence`.
If that file does not exist or has no rows, stop and reply "needs depth-findings.md". Do nothing else.

## Task
1. For each row in `docs/depth-findings.md` whose `key` exists in `structure_depths.json`:
   - set `value`;
   - set `status` to `documented`, or to `estimate-in-documented-range` if the document gives a range and you picked a value inside it;
   - set `basis` from the quote and page, and `source` from the title and url.
2. Move the used documents in `docs/sources.md` from "Found, not yet used" into the main sources table.
3. Rebake the profile and commit the new `public/data/line1_profile.json`.

## Acceptance
- Every changed entry cites a URL.
- `npm test` passes. That includes the 4% max-grade, level-platform and portal checks.
- If a documented depth breaks the grade limit, keep the documented value and add a `note` to that entry saying which section conflicts. Do not invent a different number.

## Test
`PROFILE_ONLY=1 flock /tmp/nigian-heavy-tests.lock node scripts/bake-profile.mjs > logs/bake-profile.log 2>&1; grep -iE 'length|grade|portal' logs/bake-profile.log | tail -n 20`
`flock /tmp/nigian-heavy-tests.lock npm test > logs/test.log 2>&1; grep -E 'FAIL|passed' logs/test.log | tail -n 40`

## Rules (every prompt)
- Edit only the files listed in `files:` above. Read the `read:` files for context; do not change them.
- Stack is Vite + TypeScript + Three.js. Keep `npx tsc --noEmit` clean.
- **Keys never get committed.** No API keys, tokens or passwords in code, data, logs or commit messages. None of these tasks need one.
- **Heavy runs go under the shared lock:** `flock /tmp/nigian-heavy-tests.lock <cmd>` for `npm test`, `npm run build`, bake scripts, Blender and anything that starts a browser.
- Headless only. Never open the game or a browser window on Nigel's screen. Kill any server you start.
- Trim output: send full logs to `logs/<name>.log` and look at them with `tail -n 40` or `grep`.
- Every number that is not from a cited source is labelled `ESTIMATE` in a comment or a `basis` field. No TTC logos, trademarks or copied sounds.
- Commit locally on the branch only. **Never push.** Nigel reviews first.
