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
// ---------- Grades ----------
{
  assert('gradeAccel sign: uphill decelerates', P.gradeAccel(0.04) < 0 && P.gradeAccel(-0.04) > 0);
  assert('gradeAccel magnitude on 4%', Math.abs(Math.abs(P.gradeAccel(0.04)) - 9.81 * Math.sin(Math.atan(0.04))) < 1e-9, `${P.gradeAccel(0.04).toFixed(4)} m/s²`);
  const coast = (grade) => { const tp = new P.TrainPhysics(0); tp.state.v = P.ms(30); tp.grade = grade; for (let i = 0; i < 120 * 5; i++) tp.step(dt); return tp.state.v; };
  const flat = coast(0), up = coast(0.04), down = coast(-0.04);
  assert('coasting uphill loses ~0.39 m/s² more than flat', Math.abs((flat - up) / 5 - 9.81 * Math.sin(Math.atan(0.04))) < 0.02, `Δ=${((flat - up) / 5).toFixed(3)} m/s²`);
  assert('coasting downhill speeds up', down > P.ms(30), `${P.kmh(down).toFixed(1)} km/h after 5 s`);
  const hold = new P.TrainPhysics(0); hold.grade = 0.04;
  for (let i = 0; i < 120 * 10; i++) hold.step(dt);
  assert('at rest on 4% with no power: held, no roll-back', hold.state.v === 0 && hold.state.s === 0);
  const climb = new P.TrainPhysics(0); climb.grade = 0.04; climb.lever = 1;
  for (let i = 0; i < 120 * 20; i++) climb.step(dt);
  assert('full power still climbs a 4% grade from rest', climb.state.v > P.ms(20), `${P.kmh(climb.state.v).toFixed(1)} km/h after 20 s`);
}

// ---------- Profile ----------
{
  const data = JSON.parse(await readFile(path.join(root, 'public/data/line1.json'), 'utf8'));
  const prof = JSON.parse(await readFile(path.join(root, 'public/data/line1_profile.json'), 'utf8'));
  const tr = new T.Track(data.track, prof);
  const N = prof.rail.length, ds = prof.stepM, gmax = prof.structure.maxGradePct.value / 100;
  assert('profile covers the line', Math.abs((N - 1) * ds - tr.length) < ds * 1.01, `${N} samples x ${ds} m vs ${tr.length.toFixed(0)} m`);
  assert('profile arrays aligned', prof.ground.length === N && prof.cls.length === N && prof.construction.length === N);
  assert('profile has no NaN', prof.rail.every(Number.isFinite) && prof.ground.every(Number.isFinite));
  let maxStep = 0;
  for (let i = 1; i < N; i++) maxStep = Math.max(maxStep, Math.abs(prof.rail[i] - prof.rail[i - 1]));
  assert('no sudden steps: every 5 m step within the max grade', maxStep <= gmax * ds + 0.002, `max step ${maxStep.toFixed(3)} m (limit ${(gmax * ds).toFixed(3)} m)`);
  let maxCurv = 0;
  for (let i = 2; i < N; i++) maxCurv = Math.max(maxCurv, Math.abs((prof.rail[i] - prof.rail[i - 1]) - (prof.rail[i - 1] - prof.rail[i - 2])) / ds);
  assert('grade changes gradually (vertical curves)', maxCurv < 0.02, `max grade change ${(maxCurv * 100).toFixed(2)}% per 5 m`);
  assert('max grade within the documented 4%', Math.abs(prof.maxGrade.pct) <= gmax * 100 + 0.05, `${prof.maxGrade.pct}% at ${(prof.maxGrade.atM / 1000).toFixed(2)} km`);
  let worstPlat = 0;
  for (const st of data.stations) {
    const a = Math.ceil(st.platformStartM / ds), b = Math.floor(st.platformEndM / ds);
    const seg = prof.rail.slice(a, b + 1);
    if (seg.length) worstPlat = Math.max(worstPlat, Math.max(...seg) - Math.min(...seg));
  }
  assert('platforms are level', worstPlat < 0.02, `worst rise along a platform ${worstPlat.toFixed(3)} m`);
  assert('tunnels, open sections and bridges all present', ['tunnel', 'open', 'bridge'].every((c) => prof.cls.includes(c)));
  assert('portals found, Ellis Portal named', prof.portals.length >= 4 && prof.portals.some((p) => p.name === 'Ellis Portal'), `${prof.portals.length} portals`);
  const pt = prof.portals[0];
  assert('rail is below ground at portals', prof.portals.every((p) => p.railM < prof.ground[Math.round(p.s / ds)] - 5), `first portal rail ${pt.railM} m, ground ${prof.ground[Math.round(pt.s / ds)]} m`);
  assert('Track.railAt interpolates the profile', Math.abs(tr.railAt(1002.5) - (prof.rail[200] + prof.rail[201]) / 2) < 1e-6);
  assert('Track.gradeAt matches rail slope', Math.abs(tr.gradeAt(5000) - (tr.railAt(5010) - tr.railAt(4990)) / 20) < 1e-9);
  const idx = JSON.parse(await readFile(path.join(root, 'public/data/terrain/index.json'), 'utf8'));
  const bin = await readFile(path.join(root, 'public/data/terrain/terrain.bin'));
  assert('terrain bin matches index', bin.length === idx.tiles.length * idx.grid * idx.grid * 2, `${idx.tiles.length} tiles`);
  let lo = Infinity, hi = -Infinity;
  for (let k = 0; k < bin.length; k += 2 * 37) { const h = bin.readInt16LE(k) / 10; lo = Math.min(lo, h); hi = Math.max(hi, h); }
  assert('terrain heights plausible for Toronto (40-300 m)', lo > 40 && hi < 300, `${lo.toFixed(1)}..${hi.toFixed(1)} m`);
}

// ---------- Station data ----------
{
  const data = JSON.parse(await readFile(path.join(root, 'public/data/line1.json'), 'utf8'));
  const sd = JSON.parse(await readFile(path.join(root, 'public/data/line1_stations.json'), 'utf8'));
  const S = sd.stations;
  assert('station file has all 38 stations in line order', S.length === 38 && S.every((s, i) => s.name === data.stations[i].name));
  assert('every station has a Wikipedia article', S.every((s) => s.wikipedia?.title), S.filter((s) => !s.wikipedia).map((s) => s.name).join(', '));
  assert('every station has coordinates', S.every((s) => s.coordinates && Number.isFinite(s.coordinates.lat)));
  assert('every station has an ISO opening date', S.every((s) => /^\d{4}-\d{2}-\d{2}$/.test(s.opened ?? '')), S.filter((s) => !/^\d{4}-\d{2}-\d{2}$/.test(s.opened ?? '')).map((s) => s.name).join(', '));
  assert('every station has a platform type', S.every((s) => ['island', 'side', 'island+side'].includes(s.platformType)));
  assert('mismatch flag agrees with distance', S.every((s) => s.coordMismatch === (s.wikiVsOsmM > 100)));
  const noStruct = S.filter((s) => !s.structure).map((s) => s.name);
  assert('structure known for at least 36 stations', noStruct.length <= 2, `missing: ${noStruct.join(', ') || 'none'}`);
  assert('sources recorded', /Wikipedia/.test(sd.source.facts) && /OpenStreetMap/.test(sd.source.osm));
  const nb = S.filter((s) => s.neighbourhood).length, lv = S.filter((s) => s.levels).length;
  console.log(`  info  neighbourhood found for ${nb}/38, levels for ${lv}/38 (rest left null rather than guessed)`);
}

console.log(failed ? `\n${failed} FAILED` : '\nall physics tests passed');
process.exit(failed ? 1 : 0);
