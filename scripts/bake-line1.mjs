/**
 * Bake Line 1 Yonge-University (southbound-from-Vaughan direction, OSM relation 102388:
 * "Vaughan Metropolitan Centre → Finch") into public/data/line1.json.
 *
 * Source: OpenStreetMap contributors (ODbL 1.0), via the Overpass API.
 * Raw response cached at scripts/raw/line1-relation-102388.json. Set REFETCH=1 to query again.
 *
 * Output (local metres, x = east, z = south, origin at OLAT/OLON):
 *   track:    polyline of the running line in route order (VMC → Union → Finch)
 *   stations: name, OSM stop node id, chainage along the polyline (m), platform length (m),
 *             platform start/end chainage, platformSideEstimate ('left' | 'right') relative
 *             to direction of travel (estimate: island platforms are not detected)
 * Elevation is NOT baked yet: the line is rendered flat (estimate; real line runs in tunnel,
 * open cut, and on the Bloor Viaduct/Rosedale Valley structures).
 *
 * Usage: node scripts/bake-line1.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { overpass } from './lib-overpass.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const rawPath = path.join(__dirname, 'raw/line1-relation-102388.json');
const outPath = path.join(root, 'public/data/line1.json');
const RELATION = 102388;
const R = 6378137, OLAT = 43.70, OLON = -79.40;
const toLocal = (lat, lon) => [
  ((lon - OLON) * Math.PI) / 180 * R * Math.cos((OLAT * Math.PI) / 180),
  -((lat - OLAT) * Math.PI) / 180 * R,
];

if (process.env.REFETCH || !fs.existsSync(rawPath)) {
  const q = `[out:json][timeout:180];relation(${RELATION})->.r;.r out geom;node(r.r);out body;way(r.r:"platform");out tags geom;`;
  const { text, via } = await overpass(q); // local nigian Overpass first, public mirrors fallback
  console.error(`line1 relation via ${new URL(via).host}`);
  fs.writeFileSync(rawPath, text);
}
const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
const rawStat = fs.statSync(rawPath);
const rel = raw.elements.find((e) => e.type === 'relation' && e.id === RELATION);
const nodes = new Map(raw.elements.filter((e) => e.type === 'node').map((e) => [e.id, e]));
const platformWays = new Map(raw.elements.filter((e) => e.type === 'way').map((e) => [e.id, e]));

// --- Chain the route ways (members with empty role) into one ordered polyline. ---
const wayGeoms = rel.members.filter((m) => m.type === 'way' && m.role === '' && m.geometry).map((m) => m.geometry.map((g) => toLocal(g.lat, g.lon)));
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
let line = [...wayGeoms[0]];
if (wayGeoms.length > 1) {
  const w1 = wayGeoms[1];
  const endA = Math.min(d2(line[line.length - 1], w1[0]), d2(line[line.length - 1], w1[w1.length - 1]));
  const endB = Math.min(d2(line[0], w1[0]), d2(line[0], w1[w1.length - 1]));
  if (endB < endA) line.reverse();
}
let maxGap = 0;
for (const g of wayGeoms.slice(1)) {
  const tail = line[line.length - 1];
  const seg = d2(tail, g[0]) <= d2(tail, g[g.length - 1]) ? g : [...g].reverse();
  maxGap = Math.max(maxGap, Math.sqrt(d2(tail, seg[0])));
  line.push(...(d2(tail, seg[0]) < 0.01 ? seg.slice(1) : seg));
}
// Drop near-duplicate points.
line = line.filter((p, i) => i === 0 || d2(p, line[i - 1]) > 0.25);

const cum = [0];
for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + Math.sqrt(d2(line[i], line[i - 1])));
const total = cum[cum.length - 1];

function project(p) {
  let best = { d: Infinity, s: 0, i: 0 };
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i], b = line[i + 1];
    const vx = b[0] - a[0], vz = b[1] - a[1];
    const L2 = vx * vx + vz * vz || 1e-9;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / L2));
    const q = [a[0] + vx * t, a[1] + vz * t];
    const dd = d2(p, q);
    if (dd < best.d) best = { d: dd, s: cum[i] + Math.sqrt(L2) * t, i };
  }
  return { s: best.s, offset: Math.sqrt(best.d), seg: best.i };
}

// --- Stations: pair each stop with the following platform member (PTv2 order). ---
const stations = [];
const members = rel.members;
for (let k = 0; k < members.length; k++) {
  const m = members[k];
  if (m.type !== 'node' || !m.role.startsWith('stop')) continue;
  const n = nodes.get(m.ref);
  const p = toLocal(n.lat, n.lon);
  const pr = project(p);
  let platformLen = null, side = null, platformId = null, pStart = null, pEnd = null;
  const pm = members.slice(k + 1).find((x) => x.role.startsWith('platform'));
  const pw = pm && platformWays.get(pm.ref);
  if (pw?.geometry) {
    platformId = pw.id;
    const pts = pw.geometry.map((g) => toLocal(g.lat, g.lon));
    const ss = pts.map((q) => project(q));
    pStart = Math.min(...ss.map((x) => x.s)); pEnd = Math.max(...ss.map((x) => x.s));
    platformLen = pEnd - pStart;
    // Side relative to running direction: sign of cross product at the platform centroid.
    const c = pts.reduce((a, q) => [a[0] + q[0] / pts.length, a[1] + q[1] / pts.length], [0, 0]);
    const cp = project(c);
    const a = line[cp.seg], b = line[cp.seg + 1];
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    // Estimate only: one OSM route relation follows one track, so island vs side platforms are
    // not distinguished here; this is just which side of the mapped track the platform polygon lies.
    side = cross > 0 ? 'right' : 'left'; // z points south => cross>0 is right-hand
  }
  stations.push({
    name: n.tags?.name ?? `stop ${m.ref}`,
    osmStopNode: m.ref,
    osmPlatformWay: platformId,
    chainageM: +pr.s.toFixed(1),
    stopOffsetM: +pr.offset.toFixed(1),
    platformLengthM: platformLen == null ? null : +platformLen.toFixed(1),
    platformStartM: pStart == null ? null : +pStart.toFixed(1),
    platformEndM: pEnd == null ? null : +pEnd.toFixed(1),
    platformSideEstimate: side,
  });
}

const out = {
  name: 'Line 1 Yonge-University',
  direction: rel.tags.name,
  source: {
    data: 'OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright)',
    via: 'Overpass API (refetch order: nigian local 127.0.0.1:12346, then public mirrors; the committed raw cache came from overpass-api.de)',
    relation: `https://www.openstreetmap.org/relation/${RELATION}`,
    fetched: rawStat.mtime.toISOString(),
    baked: new Date().toISOString(),
  },
  origin: { lat: OLAT, lon: OLON, note: 'equirectangular projection; x = east (m), z = south (m)' },
  lengthM: +total.toFixed(1),
  maxChainGapM: +maxGap.toFixed(2),
  track: line.map(([x, z]) => [+x.toFixed(2), +z.toFixed(2)]),
  stations,
};
fs.writeFileSync(outPath, JSON.stringify(out));
console.log(`line1: ${line.length} pts, ${(total / 1000).toFixed(2)} km, ${stations.length} stations, max way gap ${maxGap.toFixed(2)} m`);
for (const s of stations) console.log(`  ${s.chainageM.toFixed(0).padStart(6)} m  ${s.name}  plat=${s.platformLengthM}m ${s.platformSideEstimate} off=${s.stopOffsetM}m`);
