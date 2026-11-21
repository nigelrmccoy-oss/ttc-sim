/** Headless physics + track checks. Bundles src/game/Physics.ts and Track.ts with esbuild. */
import * as esbuild from 'esbuild';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const assert = (name, cond, detail = '') => {
  if (!cond) failed++;
  console[cond ? 'log' : 'error'](`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

async function load(rel) {
  const dir = await mkdtemp(path.join(tmpdir(), 'ttc-sim-'));
  const outfile = path.join(dir, 'm.mjs');
  await esbuild.build({ entryPoints: [path.join(root, rel)], outfile, format: 'esm', platform: 'neutral', bundle: true, logLevel: 'silent' });
  const mod = await import(pathToFileURL(outfile).href);
  await rm(dir, { recursive: true, force: true });
  return mod;
}

const P = await load('src/game/Physics.ts');
const T = await load('src/game/Track.ts');
const dt = 1 / 120;
console.log('TTC sim physics tests');

{ // Full power from rest
  const tp = new P.TrainPhysics(0); tp.lever = 1;
  let t = 0, maxJerk = 0, prevA = 0, maxV = 0, t60 = null;
  while (t < 120) {
    tp.step(dt); t += dt;
    maxJerk = Math.max(maxJerk, Math.abs(tp.state.aCmd - prevA) / dt); prevA = tp.state.aCmd;
    maxV = Math.max(maxV, tp.state.v);
    if (t60 == null && P.kmh(tp.state.v) >= 60) t60 = t;
  }
  assert('reaches 60 km/h in under 40 s', t60 != null && t60 < 40, `t=${t60?.toFixed(1)} s`);
  assert('never exceeds VMAX', P.kmh(maxV) <= P.VMAX_KMH + 0.01, `max=${P.kmh(maxV).toFixed(2)} km/h`);
  assert('traction respects jerk limit', maxJerk <= P.JERK_LIMIT + 1e-6, `max jerk=${maxJerk.toFixed(3)} m/s³`);
}

function brakeFrom(kmhStart, setup) {
  const tp = new P.TrainPhysics(0); tp.state.v = P.ms(kmhStart); setup(tp);
  let t = 0, prevA = 0, maxJerk = 0, minV = Infinity;
  while (tp.state.v > 0 && t < 200) {
    tp.step(dt); t += dt;
    maxJerk = Math.max(maxJerk, Math.abs(tp.state.aCmd - prevA) / dt); prevA = tp.state.aCmd;
    minV = Math.min(minV, tp.state.v);
  }
  return { dist: tp.state.s, t, maxJerk, minV, tp };
}
{
  const svc = brakeFrom(80, (tp) => { tp.lever = -1; });
  const ideal = P.ms(80) ** 2 / (2 * P.MAX_SERVICE_BRAKE);
  assert('full service stop from 80 km/h', svc.dist > ideal && svc.dist < ideal + 60, `${svc.dist.toFixed(0)} m in ${svc.t.toFixed(1)} s (ideal no-jerk ${ideal.toFixed(0)} m)`);
  assert('service braking respects jerk limit', svc.maxJerk <= P.JERK_LIMIT + 1e-6, `${svc.maxJerk.toFixed(3)} m/s³`);
  assert('speed never negative', svc.minV >= 0);
  const eb = brakeFrom(80, (tp) => { tp.emergency = true; });
  assert('emergency stops shorter than service', eb.dist < svc.dist, `${eb.dist.toFixed(0)} m vs ${svc.dist.toFixed(0)} m`);
  const before = eb.tp.state.s;
  for (let i = 0; i < 600; i++) eb.tp.step(dt);
  assert('train stays at rest after stopping', eb.tp.state.v === 0 && eb.tp.state.s === before);
}
{
  const tp = new P.TrainPhysics(0); tp.state.v = P.ms(50); tp.lever = 0;
  for (let i = 0; i < 120 * 10; i++) tp.step(dt);
  assert('coasting slowly decelerates', tp.state.v < P.ms(50) && tp.state.v > P.ms(45), `${P.kmh(tp.state.v).toFixed(2)} km/h after 10 s`);
}
{
  const data = JSON.parse(await readFile(path.join(root, 'public/data/line1.json'), 'utf8'));
  const tr = new T.Track(data.track);
  assert('line length plausible (36-41 km)', tr.length > 36000 && tr.length < 41000, `${(tr.length / 1000).toFixed(2)} km`);
  assert('38 stations', data.stations.length === 38, `${data.stations.length}`);
  const ch = data.stations.map((s) => s.chainageM);
  assert('stations in increasing chainage order', ch.every((c, i) => i === 0 || c > ch[i - 1]));
  assert('route passes Union', data.stations.some((s) => s.name === 'Union'));
  const p = tr.poseAt(1234.5);
  assert('track tangent is unit length', Math.abs(Math.hypot(p.tx, p.tz) - 1) < 1e-6);
  assert('data file records source + date', /OpenStreetMap/.test(data.source.data) && !!data.source.fetched);
}
console.log(failed ? `\n${failed} FAILED` : '\nall physics tests passed');
process.exit(failed ? 1 : 0);
