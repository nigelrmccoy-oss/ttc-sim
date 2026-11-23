/**
 * Bake Line 1's vertical profile, structure classes, and carved terrain tiles.
 *
 * Inputs: public/data/line1.json, public/data/line1_stations.json, scripts/raw/line1-ways-tags.json,
 *         scripts/raw/line1-relation-102388.json, NRCan HRDEM 1 m DTM (fallback: AWS Terrarium).
 * Outputs: public/data/line1_profile.json  (5 m samples: ground, rail, class, construction, grade)
 *          public/data/terrain/index.json + terrain.bin (web-mercator z15 tiles, 129x129 Int16 dm)
 * Sources and which values are estimates: see docs/sources.md and the STRUCTURE table below.
 * Usage: node scripts/bake-profile.mjs   (network; a few minutes; caches HRDEM track samples in scripts/raw/)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toLocal, toLatLon, tileX, tileY, tileLat, tileLon, sampleHrdem, sampleTerrarium, HRDEM_DTM } from './lib-geo.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const line = rd('public/data/line1.json');
const wiki = rd('public/data/line1_stations.json').stations;
const tags = new Map(rd('scripts/raw/line1-ways-tags.json').elements.map((e) => [e.id, e.tags]));
const rel = rd('scripts/raw/line1-relation-102388.json').elements.find((e) => e.type === 'relation');
const DS = 5;

// ---------- Structure parameters (documented where cited, otherwise ESTIMATE) ----------
const STRUCTURE = {
  maxGradePct: { value: 4.0, basis: 'documented: steepest Line 1 grade is 4% north of Summerhill (nycsubway.org, TTC Yonge-University-Spadina Subway)' },
  tysseBoredRailDepth: { value: 24, basis: 'TYSSE twin bores: invert 20-30 m below surface (Tunnel Business Magazine, Dec 2013); rail ~1 m above a 25 m invert = ESTIMATE within that range' },
  tysseStationRailDepth: { value: 17, basis: 'ESTIMATE (TYSSE station boxes are cut-and-cover; depth not found yet)' },
  boreInternalDiameter: { value: 5.4, basis: 'documented: TYSSE bored tunnels 5.4 m internal diameter, 6.1 m bore (TBM magazine 2013; TAC 2012 paper)' },
  yonge1954BoxRailDepth: { value: 9.5, basis: '1954 Yonge cut-and-cover excavated to final grade 30-40 ft (9.1-12.2 m) below street (Proc. ICE 1954 / NRC strain-measurement paper); 9.5 m = ESTIMATE within range' },
  universityBoredRailDepth: { value: 15, basis: "ESTIMATE: Queen's Park and St. Patrick are in bored tunnels (Wikipedia, Line 1 Yonge-University); depth not found yet" },
  otherBoxRailDepth: { value: 10, basis: 'ESTIMATE: other cut-and-cover box sections (1963 University, 1973-74 North Yonge, 1978 Spadina, 1996 Sheppard West)' },
  boxHeightAboveRail: { value: 5.0, basis: 'ESTIMATE: rail top to box roof (inside)' },
  portalCover: { value: 1.0, basis: 'ESTIMATE: soil/structure over the roof at a portal face' },
  rosedaleCutDepth: { value: 6.0, basis: 'Rosedale is an open-cut station (Wikipedia infobox); depth ESTIMATE' },
  verticalCurveRadius: { value: 1250, basis: 'ESTIMATE: minimum vertical curve radius (m) used to round grade changes' },
};
const G = STRUCTURE.maxGradePct.value / 100;

// ---------- Track samples ----------
const pts = line.track;
const cum = [0];
for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
const L = cum[cum.length - 1];
function pose(s) {
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
  const a = pts[lo], b = pts[Math.min(lo + 1, pts.length - 1)], l = cum[lo + 1] - cum[lo] || 1e-9;
  const t = (s - cum[lo]) / l;
  return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, tx: (b[0] - a[0]) / l, tz: (b[1] - a[1]) / l };
}
function project([x, z]) {
  let best = { d: Infinity, s: 0 };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], vx = b[0] - a[0], vz = b[1] - a[1], L2 = vx * vx + vz * vz || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / L2));
    const d = (x - a[0] - vx * t) ** 2 + (z - a[1] - vz * t) ** 2;
    if (d < best.d) best = { d, s: cum[i] + Math.sqrt(L2) * t };
  }
  return best.s;
}
const N = Math.floor(L / DS) + 1;
const S = Array.from({ length: N }, (_, i) => Math.min(L, i * DS));

// ---------- OSM classes per way ----------
const ranges = [];
for (const m of rel.members.filter((m) => m.type === 'way' && m.role === '' && m.geometry)) {
  const g = m.geometry, t = tags.get(m.ref) ?? {};
  const s0 = project(toLocal(g[0].lat, g[0].lon)), s1 = project(toLocal(g[g.length - 1].lat, g[g.length - 1].lon));
  const cls = t.tunnel === 'yes' ? 'tunnel' : t.bridge === 'yes' ? 'bridge' : 'open';
  ranges.push({ s0: Math.min(s0, s1), s1: Math.max(s0, s1), cls, way: m.ref, tags: { tunnel: t.tunnel, bridge: t.bridge, layer: t.layer, covered: t.covered } });
}
ranges.sort((a, b) => a.s0 - b.s0);
const clsAt = (s) => (ranges.find((r) => s >= r.s0 - 0.5 && s <= r.s1 + 0.5) ?? { cls: 'tunnel' }).cls;

const st = Object.fromEntries(line.stations.map((x) => [x.name, x]));
const wst = Object.fromEntries(wiki.map((x) => [x.name, x]));
const pE = (n) => st[n].platformEndM ?? st[n].chainageM, pS = (n) => st[n].platformStartM ?? st[n].chainageM;
const inStation = (s, pad = 40) => line.stations.find((x) => s >= (x.platformStartM ?? x.chainageM) - pad && s <= (x.platformEndM ?? x.chainageM) + pad);

// Construction method per sample (see docs/sources.md).
function construction(s, cls) {
  if (cls === 'bridge') return 'viaduct';
  if (cls === 'open') {
    const stn = inStation(s, 60);
    if (stn && wst[stn.name]?.structure === 'open cut') return 'open cut';
    return s > pE('Bloor-Yonge') && s < pS('Eglinton') ? 'open cut' : 'at-grade';
  }
  const stn = inStation(s, 20);
  if (s < pS('Sheppard West') - 100) return stn ? 'box (TYSSE station)' : 'bored (TYSSE twin)';
  if (s > pE('Museum') + 30 && s < pS('Osgoode') - 30) return 'bored (University)';
  if (s >= pS('Union') - 200 && s <= pS('Eglinton') + 200) return 'box (Yonge 1954)';
  return 'box';
}
const railDepth = (c) => ({
  'bored (TYSSE twin)': STRUCTURE.tysseBoredRailDepth.value,
  'box (TYSSE station)': STRUCTURE.tysseStationRailDepth.value,
  'bored (University)': STRUCTURE.universityBoredRailDepth.value,
  'box (Yonge 1954)': STRUCTURE.yonge1954BoxRailDepth.value,
  'box': STRUCTURE.otherBoxRailDepth.value,
}[c] ?? 0);

// ---------- Ground along the track ----------
const cachePath = path.join(root, 'scripts/raw/hrdem-track-5m.json');
let ground, gsrc;
if (fs.existsSync(cachePath) && !process.env.REFETCH) ({ ground, gsrc } = JSON.parse(fs.readFileSync(cachePath, 'utf8')));
else {
  ground = new Array(N).fill(NaN); gsrc = new Array(N).fill('hrdem');
  for (let i0 = 0; i0 < N; i0 += 100) {
    const idx = [...Array(Math.min(100, N - i0)).keys()].map((k) => i0 + k);
    const ll = idx.map((i) => { const p = pose(S[i]); return toLatLon(p.x, p.z); });
    const h = await sampleHrdem(ll, 1, 5);
    for (let k = 0; k < idx.length; k++) {
      if (Number.isFinite(h[k])) ground[idx[k]] = h[k];
      else { ground[idx[k]] = await sampleTerrarium(...ll[k]); gsrc[idx[k]] = 'terrarium'; }
    }
    process.stdout.write(`\rground ${Math.min(N, i0 + 100)}/${N}`);
  }
  console.log();
  fs.writeFileSync(cachePath, JSON.stringify({ source: HRDEM_DTM, fetched: new Date().toISOString(), ground: ground.map((v) => +v.toFixed(2)), gsrc }));
}
const smooth = (arr, half) => arr.map((_, i) => { let a = 0, n = 0; for (let k = Math.max(0, i - half); k <= Math.min(arr.length - 1, i + half); k++) { a += arr[k]; n++; } return a / n; });
const gSm = smooth(ground, 20); // 200 m window for open sections: ignores road cuts / building-scale noise
// Tunnels do not follow every surface undulation: target depth below a 600 m running mean (ESTIMATE).
const gTun = smooth(ground, 60);

// ---------- Rail target ----------
const cls = S.map(clsAt), cons = S.map((s, i) => construction(s, cls[i]));
// Short tunnels (< 150 m) between open sections are road crossings over the line (covered ways):
// the rail stays at the open-section level and they get no portals. (ESTIMATE threshold.)
const SHORT_TUNNEL_M = 150;
const shortTun = new Uint8Array(N);
for (let i = 0; i < N; i++) if (cls[i] === 'tunnel') {
  let j = i; while (j < N && cls[j] === 'tunnel') j++;
  if ((j - i) * DS < SHORT_TUNNEL_M && i > 0 && j < N) for (let k = i; k < j; k++) { shortTun[k] = 1; cons[k] = 'covered way'; }
  i = j;
}
const target = S.map((s, i) => {
  if (shortTun[i]) return gSm[i];
  if (cls[i] === 'tunnel') return gTun[i] - railDepth(cons[i]);
  if (cls[i] === 'open') return gSm[i] - (cons[i] === 'open cut' ? STRUCTURE.rosedaleCutDepth.value * (inStation(s, 60)?.name === 'Rosedale' ? 1 : 0.5) : 0);
  return NaN; // bridge: interpolated below
});
for (let i = 0; i < N; i++) if (cls[i] === 'bridge') { // straight deck between abutments
  let j = i; while (j < N && cls[j] === 'bridge') j++;
  const a = Math.max(0, i - 1), b = Math.min(N - 1, j);
  const ha = Number.isFinite(target[a]) ? target[a] : gSm[a], hb = Number.isFinite(target[b]) ? target[b] : gSm[b];
  for (let k = i; k < j; k++) target[k] = ha + (hb - ha) * ((k - a) / (b - a || 1));
  i = j;
}
// Portals: pin the rail so roof + cover sits just below ground at the portal face.
const portals = [];
const isTun = (i) => cls[i] === 'tunnel' && !shortTun[i];
for (let i = 1; i < N; i++) if (isTun(i) !== isTun(i - 1)) {
  const ti = isTun(i) ? i : i - 1;
  const r = ground[ti] - STRUCTURE.boxHeightAboveRail.value - STRUCTURE.portalCover.value;
  portals.push({ i: ti, s: S[ti], rail: r, facing: isTun(i) ? 'tunnel ahead (increasing chainage)' : 'tunnel behind' });
}
for (const p of portals) if (p.s > pE('Bloor-Yonge') && p.s < pS('Rosedale')) p.name = 'Ellis Portal'; // Transit Toronto: north of Church/Davenport
const pins = new Map(portals.map((p) => [p.i, p.rail]));
const platforms = line.stations.map((x) => [Math.max(0, Math.floor(pS(x.name) / DS)), Math.min(N - 1, Math.ceil(pE(x.name) / DS))]);
const flatten = (h) => { for (const [a, b] of platforms) { let m = 0; for (let k = a; k <= b; k++) m += h[k]; m /= b - a + 1; for (let k = a; k <= b; k++) h[k] = m; } };
const limit = (h) => {
  for (let i = 1; i < N; i++) h[i] = Math.max(h[i - 1] - G * DS, Math.min(h[i - 1] + G * DS, h[i]));
  for (let i = N - 2; i >= 0; i--) h[i] = Math.max(h[i + 1] - G * DS, Math.min(h[i + 1] + G * DS, h[i]));
};
// 1) Level platforms in the target, and pin them plus the portals.
const fixed = new Map(); // sample index -> height
let rail = target.slice();
flatten(rail);
for (const [a, b] of platforms) for (let k = a; k <= b; k++) fixed.set(k, rail[k]);
for (const [pi, ph] of pins) if (!fixed.has(pi)) fixed.set(pi, ph);
// 2) Make the pins mutually reachable within the max grade (forward/backward over the pin list).
const pinIdx = [...fixed.keys()].sort((a, b) => a - b);
for (let k = 1; k < pinIdx.length; k++) { const a = pinIdx[k - 1], b = pinIdx[k], d = (S[b] - S[a]) * G; fixed.set(b, Math.max(fixed.get(a) - d, Math.min(fixed.get(a) + d, fixed.get(b)))); }
for (let k = pinIdx.length - 2; k >= 0; k--) { const a = pinIdx[k], b = pinIdx[k + 1], d = (S[b] - S[a]) * G; fixed.set(a, Math.max(fixed.get(b) - d, Math.min(fixed.get(b) + d, fixed.get(a)))); }
// 3) Envelope from the pins, then slope-limit both ways (pins satisfy the envelope, so they stay exact).
for (let i = 0; i < N; i++) {
  if (fixed.has(i)) { rail[i] = fixed.get(i); continue; }
  // nearest pins either side bound the reachable band
  let lo = -Infinity, hi = Infinity;
  const j = pinIdx.findIndex((p) => p > i);
  for (const p of [pinIdx[j - 1], pinIdx[j]]) if (p != null) { const d = Math.abs(S[i] - S[p]) * G, h = fixed.get(p); lo = Math.max(lo, h - d); hi = Math.min(hi, h + d); }
  rail[i] = Math.max(lo, Math.min(hi, rail[i]));
}
limit(rail);
// 4) Vertical curves: limit the change of grade per 5 m (ESTIMATE ~1250 m minimum vertical curve radius),
//    keep platforms at 0, then pull each free span back onto its platform levels with a linear correction.
const C = STRUCTURE.verticalCurveRadius ? DS / STRUCTURE.verticalCurveRadius.value : 0.004;
const onPlat = new Uint8Array(N);
for (const [a, b] of platforms) for (let k = a; k <= b; k++) onPlat[k] = 1;
const segFixed = (i) => i > 0 && onPlat[i] && onPlat[i - 1];
// Anchors: platform ends and portals keep their heights; free spans between them absorb drift.
const anchorH = new Map([[0, rail[0]], [N - 1, rail[N - 1]]]);
for (const [a, b] of platforms) { anchorH.set(a, rail[a]); anchorH.set(b, rail[a]); }
// Portals are not anchors: the envelope above already put them below ground; the fit may move them slightly.
const railBeforeFit = rail.slice();
function fit(anchors) {
  rail = railBeforeFit.slice();
for (let iter = 0; iter < 12; iter++) {
  const g = rail.map((_, i) => (i === 0 ? 0 : (rail[i] - rail[i - 1]) / DS));
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < N; i++) g[i] = segFixed(i) ? 0 : Math.max(-G, Math.min(G, g[i]));
    for (let i = 2; i < N; i++) if (!segFixed(i)) g[i] = Math.max(g[i - 1] - C, Math.min(g[i - 1] + C, g[i]));
    for (let i = N - 2; i >= 1; i--) if (!segFixed(i)) g[i] = Math.max(g[i + 1] - C, Math.min(g[i + 1] + C, g[i]));
  }
  const integ = [rail[0]];
  for (let i = 1; i < N; i++) integ.push(integ[i - 1] + g[i] * DS);
  const corr = new Array(N).fill(0);
  for (let k = 0; k < anchors.length - 1; k++) {
    const [a, ha] = anchors[k], [b, hb] = anchors[k + 1];
    const ea = ha - integ[a], eb = hb - integ[b];
    // Smooth (cosine) blend so the correction adds no kink at the anchors.
    for (let i = a; i <= b; i++) { const t = (i - a) / Math.max(1, b - a); corr[i] = ea + (eb - ea) * (0.5 - 0.5 * Math.cos(Math.PI * t)); }
  }
  rail = integ.map((h, i) => h + corr[i]);
}
}
// Fit; then anchor any portal whose box roof would poke out of the ground and refit (a few rounds).
const portalAnchors = new Map();
for (let round = 0; round < 4; round++) {
  fit([...new Map([...anchorH, ...portalAnchors]).entries()].sort((p, q) => p[0] - q[0]));
  let added = 0;
  for (const p of portals) {
    let need = ground[p.i] - STRUCTURE.boxHeightAboveRail.value - STRUCTURE.portalCover.value;
    // Keep it reachable from the neighbouring platform levels at 75% of the max grade, leaving room for vertical curves.
    for (const [ai, ah] of anchorH) need = Math.max(need, ah - 0.75 * G * Math.abs(S[ai] - S[p.i]));
    if (rail[p.i] > ground[p.i] - STRUCTURE.boxHeightAboveRail.value && !portalAnchors.has(p.i) && !onPlat[p.i]) { portalAnchors.set(p.i, need); added++; }
  }
  if (!added) break;
}
for (const [a, b] of platforms) for (let k = a; k <= b; k++) rail[k] = rail[a];
// Final safety pass: hard grade limit (moves only the few samples the curve fit pushed past 4%).
limit(rail);
for (const p of portals) p.rail = rail[p.i];

const grade = rail.map((_, i) => (i === 0 ? rail[1] - rail[0] : rail[i] - rail[i - 1]) / DS);
let maxG = 0, maxGs = 0;
grade.forEach((g, i) => { if (Math.abs(g) > Math.abs(maxG)) { maxG = g; maxGs = S[i]; } });
const lenBy = {}, lenCls = {};
for (let i = 1; i < N; i++) { lenBy[cons[i]] = (lenBy[cons[i]] ?? 0) + DS; lenCls[cls[i]] = (lenCls[cls[i]] ?? 0) + DS; }

const profile = {
  source: {
    ground: `NRCan HRDEM mosaic 1 m DTM (${HRDEM_DTM}), Open Government Licence - Canada; fallback AWS Terrain Tiles (Terrarium) where HRDEM is nodata`,
    classes: 'OpenStreetMap way tags tunnel/bridge/layer on relation 102388 (ODbL)',
    construction: 'see docs/sources.md; per-parameter basis in "structure"',
  },
  stepM: DS,
  structure: STRUCTURE,
  groundSourceCounts: gsrc.reduce((a, v) => ((a[v] = (a[v] ?? 0) + 1), a), {}),
  lengthsByClassM: lenCls,
  lengthsByConstructionM: lenBy,
  maxGrade: { pct: +(maxG * 100).toFixed(2), atM: maxGs },
  portals: portals.map((p) => ({ s: p.s, railM: +p.rail.toFixed(2), facing: p.facing, name: p.name ?? null })),
  osmRanges: ranges.map((r) => ({ ...r, s0: +r.s0.toFixed(1), s1: +r.s1.toFixed(1) })),
  ground: ground.map((v) => +v.toFixed(2)),
  rail: rail.map((v) => +v.toFixed(3)),
  cls,
  construction: cons,
  groundSource: gsrc,
};
fs.writeFileSync(path.join(root, 'public/data/line1_profile.json'), JSON.stringify(profile));
console.log('by class (m):', lenCls);
console.log('by construction (m):', lenBy);
console.log('max grade', profile.maxGrade, '| portals', profile.portals.map((p) => `${(p.s / 1000).toFixed(2)}${p.name ? ' ' + p.name : ''}`).join(', '));
console.log('ground sources', profile.groundSourceCounts);
if (process.env.PROFILE_ONLY) process.exit(0);

// ---------- Terrain tiles (z15 web mercator, 129x129 vertices, carved around the line) ----------
const Z = 15, GRID = 129, CORRIDOR = 600;
const tiles = new Set();
for (let s = 0; s <= L; s += 50) {
  const p = pose(s);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) {
    const [lat, lon] = toLatLon(p.x + dx * CORRIDOR, p.z + dz * CORRIDOR);
    tiles.add(`${tileX(lon, Z)},${tileY(lat, Z)}`);
  }
}
const cell = 100, hash = new Map();
for (let i = 0; i < N; i++) { const p = pose(S[i]); const k = `${Math.floor(p.x / cell)},${Math.floor(p.z / cell)}`; if (!hash.has(k)) hash.set(k, []); hash.get(k).push(i); }
function nearest(x, z) {
  const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
  let best = null, bd = Infinity;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
    for (const i of hash.get(`${cx + a},${cz + b}`) ?? []) { const p = pose(S[i]); const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = i; } }
  }
  if (best == null) return null;
  const p = pose(S[best]);
  return { i: best, lat: (x - p.x) * -p.tz + (z - p.z) * p.tx };
}
const OTHER_TRACK = -3.7; // ESTIMATE: other running track centre 3.7 m to the left
function carve(h0, x, z) {
  const n = nearest(x, z);
  if (!n) return h0;
  const c = cls[n.i], r = rail[n.i];
  const dd = Math.abs(n.lat - OTHER_TRACK / 2);
  if (c === 'open') {
    const wb = 5.5, base = r - 0.35, k = Math.max(0, dd - wb) / 1.5; // 1V:1.5H side slopes (ESTIMATE)
    return Math.max(base - k, Math.min(base + k, h0));
  }
  if (c === 'bridge') return dd < 6 ? Math.min(h0, r - 3) : h0;
  const crown = r + STRUCTURE.boxHeightAboveRail.value + 0.6;
  const w = cons[n.i].startsWith('bored') ? 8 : 6.5;
  return dd < w ? Math.max(h0, crown) : Math.max(h0, crown - (dd - w) / 1.5);
}
const tileList = [...tiles].map((t) => t.split(',').map(Number)).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
const bin = Buffer.alloc(tileList.length * GRID * GRID * 2);
const index = [];
let off = 0;
for (const [tx, ty] of tileList) {
  const lat0 = tileLat(ty, Z), lat1 = tileLat(ty + 1, Z), lon0 = tileLon(tx, Z), lon1 = tileLon(tx + 1, Z);
  const my0 = Math.log(Math.tan(Math.PI / 4 + (lat0 * Math.PI) / 360)), my1 = Math.log(Math.tan(Math.PI / 4 + (lat1 * Math.PI) / 360));
  const ll = [];
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
    const lat = ((2 * Math.atan(Math.exp(my0 + (my1 - my0) * (j / (GRID - 1)))) - Math.PI / 2) * 180) / Math.PI;
    ll.push([lat, lon0 + (lon1 - lon0) * (i / (GRID - 1))]);
  }
  const h = await sampleHrdem(ll, 3.5, 20);
  let usedT = 0;
  for (let k = 0; k < h.length; k++) {
    if (!Number.isFinite(h[k])) { h[k] = await sampleTerrarium(...ll[k]); usedT++; }
    const [x, z] = toLocal(...ll[k]);
    bin.writeInt16LE(Math.round(carve(h[k], x, z) * 10), off + k * 2);
  }
  index.push({ z: Z, x: tx, y: ty, offset: off, source: usedT ? `hrdem+terrarium(${usedT} vertices)` : 'hrdem' });
  off += GRID * GRID * 2;
  process.stdout.write(`\rterrain ${index.length}/${tileList.length}`);
}
console.log();
fs.writeFileSync(path.join(root, 'public/data/terrain/terrain.bin'), bin);
fs.writeFileSync(path.join(root, 'public/data/terrain/index.json'), JSON.stringify({
  source: profile.source.ground,
  carved: 'terrain is lowered/raised along the line for cuts, embankments and tunnel cover (ESTIMATE 1V:1.5H slopes)',
  grid: GRID, encoding: 'Int16LE decimetres, row-major, rows north->south evenly spaced in mercator y', zoom: Z, tiles: index,
}));
console.log(`terrain tiles: ${index.length}, terrarium-assisted: ${index.filter((t) => t.source !== 'hrdem').length}`);
